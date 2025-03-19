use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use ring::aead::{self, BoundKey, Nonce, NonceSequence, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{command, State};

// 加密数据结构
#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptedData {
    ciphertext: String,
    iv: String,
    tag: Option<String>,
}

// 密钥信息
#[derive(Serialize, Deserialize, Clone)]
pub struct KeyInfo {
    id: String,
    algorithm: String,
    created_at: String,
}

// 密钥存储
pub struct KeyStore {
    master_key: Mutex<Option<Vec<u8>>>,
    data_keys: Mutex<HashMap<String, Vec<u8>>>,
}

// 固定的 Nonce 序列（在实际应用中应该使用随机 Nonce）
struct FixedNonce(Vec<u8>);

impl NonceSequence for FixedNonce {
    fn advance(&mut self) -> Result<Nonce, ring::error::Unspecified> {
        Nonce::try_assume_unique_for_key(&self.0)
    }
}

impl KeyStore {
    pub fn new() -> Self {
        KeyStore {
            master_key: Mutex::new(None),
            data_keys: Mutex::new(HashMap::new()),
        }
    }
}

// 初始化加密服务
#[command]
pub fn initialize() -> Result<(), String> {
    Ok(())
}

// 生成主密钥
#[command]
pub fn generate_master_key(key_store: State<'_, KeyStore>) -> Result<KeyInfo, String> {
    let key_store = key_store.inner();

    // 获取主密钥锁
    let mut master_key = key_store.master_key.lock().map_err(|e| e.to_string())?;

    // 如果已有主密钥，返回信息
    if master_key.is_some() {
        return Ok(KeyInfo {
            id: "master".to_string(),
            algorithm: "AES-256-GCM".to_string(),
            created_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_secs()
                .to_string(),
        });
    }

    // 生成随机主密钥
    let rng = SystemRandom::new();
    let mut key = vec![0; 32]; // AES-256 需要 32 字节密钥
    rng.fill(&mut key).map_err(|e| e.to_string())?;

    // 存储主密钥
    *master_key = Some(key);

    Ok(KeyInfo {
        id: "master".to_string(),
        algorithm: "AES-256-GCM".to_string(),
        created_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs()
            .to_string(),
    })
}

// 为话题生成数据密钥
#[command]
pub fn generate_data_key(
    topic_id: String,
    key_store: State<'_, KeyStore>,
) -> Result<KeyInfo, String> {
    let key_store = key_store.inner();

    // 确保主密钥存在
    {
        let master_key = key_store.master_key.lock().map_err(|e| e.to_string())?;
        if master_key.is_none() {
            return Err("Master key not initialized".to_string());
        }
    }

    // 检查是否已有该话题的密钥
    {
        let data_keys = key_store.data_keys.lock().map_err(|e| e.to_string())?;
        if data_keys.contains_key(&topic_id) {
            return Ok(KeyInfo {
                id: topic_id,
                algorithm: "AES-256-GCM".to_string(),
                created_at: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map_err(|e| e.to_string())?
                    .as_secs()
                    .to_string(),
            });
        }
    }

    // 生成随机数据密钥
    let rng = SystemRandom::new();
    let mut key = vec![0; 32]; // AES-256 需要 32 字节密钥
    rng.fill(&mut key).map_err(|e| e.to_string())?;

    // 存储数据密钥
    {
        let mut data_keys = key_store.data_keys.lock().map_err(|e| e.to_string())?;
        data_keys.insert(topic_id.clone(), key);
    }

    Ok(KeyInfo {
        id: topic_id,
        algorithm: "AES-256-GCM".to_string(),
        created_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs()
            .to_string(),
    })
}

// 加密数据
#[command]
pub fn encrypt(
    data: String,
    topic_id: String,
    key_store: State<'_, KeyStore>,
) -> Result<EncryptedData, String> {
    let key_store = key_store.inner();

    // 获取数据密钥
    let data_key = {
        let data_keys = key_store.data_keys.lock().map_err(|e| e.to_string())?;
        data_keys
            .get(&topic_id)
            .cloned()
            .ok_or_else(|| format!("Data key not found for topic: {}", topic_id))?
    };

    // 生成随机 IV
    let rng = SystemRandom::new();
    let mut iv = vec![0; 12]; // AES-GCM 需要 12 字节 IV
    rng.fill(&mut iv).map_err(|e| e.to_string())?;

    // 创建加密上下文
    let unbound_key = UnboundKey::new(&AES_256_GCM, &data_key).map_err(|e| e.to_string())?;
    let nonce_sequence = FixedNonce(iv.clone());
    let mut sealing_key = aead::SealingKey::new(unbound_key, nonce_sequence);

    // 加密数据
    let mut in_out = data.into_bytes();
    let tag = sealing_key
        .seal_in_place_separate_tag(aead::Aad::empty(), &mut in_out)
        .map_err(|e| e.to_string())?;

    // 编码为 Base64
    let ciphertext = BASE64.encode(&in_out);
    let iv_base64 = BASE64.encode(&iv);
    let tag_base64 = BASE64.encode(tag.as_ref());

    Ok(EncryptedData {
        ciphertext,
        iv: iv_base64,
        tag: Some(tag_base64),
    })
}

// 解密数据
#[command]
pub fn decrypt(
    encrypted_data: EncryptedData,
    topic_id: String,
    key_store: State<'_, KeyStore>,
) -> Result<String, String> {
    let key_store = key_store.inner();

    // 获取数据密钥
    let data_key = {
        let data_keys = key_store.data_keys.lock().map_err(|e| e.to_string())?;
        data_keys
            .get(&topic_id)
            .cloned()
            .ok_or_else(|| format!("Data key not found for topic: {}", topic_id))?
    };

    // 解码 Base64
    let mut ciphertext = BASE64
        .decode(&encrypted_data.ciphertext)
        .map_err(|e| e.to_string())?;
    let iv = BASE64
        .decode(&encrypted_data.iv)
        .map_err(|e| e.to_string())?;
    let tag = encrypted_data
        .tag
        .map(|t| BASE64.decode(&t).map_err(|e| e.to_string()))
        .transpose()?;

    // 如果有单独的标签，附加到密文末尾
    if let Some(tag) = tag {
        ciphertext.extend_from_slice(&tag);
    }

    // 创建解密上下文
    let unbound_key = UnboundKey::new(&AES_256_GCM, &data_key).map_err(|e| e.to_string())?;
    let _nonce = Nonce::try_assume_unique_for_key(&iv).map_err(|e| e.to_string())?;
    let mut opening_key = aead::OpeningKey::new(unbound_key, FixedNonce(iv));

    // 解密数据
    let plaintext = opening_key
        .open_in_place(aead::Aad::empty(), &mut ciphertext)
        .map_err(|e| e.to_string())?;

    // 转换为字符串
    let plaintext_str = String::from_utf8(plaintext.to_vec()).map_err(|e| e.to_string())?;

    Ok(plaintext_str)
}
