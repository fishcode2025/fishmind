import { IDatabaseService } from '../services/database/interfaces';
import { IMcpServerConfigRepository } from './interfaces';
import { McpServerConfig, TransportType } from '../models/mcpTypes';

export class McpServerConfigRepository implements IMcpServerConfigRepository {
  constructor(private db: IDatabaseService) {}

  public parseConfig(row: any): McpServerConfig {
    return {
      id: row.id,
      name: row.name,
      transportType: row.transport_type as TransportType,
      sseUrl: row.sse_url,
      sseHeaders: row.sse_headers ? JSON.parse(row.sse_headers) : undefined,
      command: row.command || undefined,
      args: row.args ? JSON.parse(row.args) : undefined,
      envVars: row.env_vars ? JSON.parse(row.env_vars) : undefined,
      timeoutSecs: Number(row.timeout_secs || 0),
      clientName: row.client_name,
      clientVersion: row.client_version,
      enabled: row.enabled === 1 || row.enabled === true
    };
  }

  public mapToDb(config: Partial<McpServerConfig>): any {
    return {
      id: config.id,
      name: config.name,
      transport_type: config.transportType,
      sse_url: config.sseUrl,
      sse_headers: config.sseHeaders ? JSON.stringify(config.sseHeaders) : null,
      command: config.command,
      args: config.args ? JSON.stringify(config.args) : null,
      env_vars: config.envVars ? JSON.stringify(config.envVars) : null,
      timeout_secs: config.timeoutSecs,
      client_name: config.clientName,
      client_version: config.clientVersion,
      enabled: config.enabled === true ? 1 : 0
    };
  }

  async findById(id: string): Promise<McpServerConfig | null> {
    const row = await this.db.get<any>(
      `SELECT * FROM mcp_server_configs WHERE id = ?`,
      [id]
    );
    return row ? this.parseConfig(row) : null;
  }

  async findAll(): Promise<McpServerConfig[]> {
    const rows = await this.db.query<any>(
      `SELECT * FROM mcp_server_configs ORDER BY created_at DESC`
    );
    return rows.map(this.parseConfig);
  }

  async create(config: Omit<McpServerConfig, 'id'>): Promise<McpServerConfig> {
    const id = crypto.randomUUID();
    const dbConfig = this.mapToDb({ ...config, id });
    
    await this.db.execute(
      `INSERT INTO mcp_server_configs (
        id, name, transport_type, sse_url, sse_headers, 
        command, args, env_vars, timeout_secs, client_name, client_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbConfig.id,
        dbConfig.name,
        dbConfig.transport_type,
        dbConfig.sse_url,
        dbConfig.sse_headers,
        dbConfig.command,
        dbConfig.args,
        dbConfig.env_vars,
        dbConfig.timeout_secs,
        dbConfig.client_name,
        dbConfig.client_version
      ]
    );
    
    return this.parseConfig(dbConfig);
  }

  async update(id: string, config: Partial<McpServerConfig>): Promise<McpServerConfig> {
    // 1. 获取当前配置
    const current = await this.findById(id);
    if (!current) throw new Error(`Config with id ${id} not found`);
    
    console.log('[UPDATE] Current config:', current);
    console.log('[UPDATE] Update payload:', config);
    
    // 2. 合并配置
    const mergedConfig = { ...current, ...config };
    console.log('[UPDATE] Merged config:', mergedConfig);
    
    // 3. 转换为数据库格式
    const dbConfig = this.mapToDb(mergedConfig);
    console.log('[UPDATE] Mapped DB config:', dbConfig);
    
    // 4. 构建更新SQL
    const updates = Object.keys(dbConfig)
      .filter(key => dbConfig[key] !== undefined)
      .map(key => `${key} = ?`);
    
    const params = [
      ...Object.values(dbConfig).filter(v => v !== undefined),
      id
    ];
  
    const updateSql = `UPDATE mcp_server_configs SET ${updates.join(', ')} WHERE id = ?`;
    console.log('[UPDATE] Generated SQL:', updateSql);
    console.log('[UPDATE] Query parameters:', params);
  
    // 5. 执行更新，不使用显式事务，依赖SQLiteService的事务管理
    try {
      await this.db.execute(updateSql, params);
      
      // 强制刷新缓存
      await this.db.execute('PRAGMA wal_checkpoint;');
    } catch (error) {
      console.error('[UPDATE] Error during update:', error);
      throw error;
    }
    
    // 6. 重新查询以获取更新后的数据
    const result = await this.db.get<any>(
      `SELECT * FROM mcp_server_configs WHERE id = ?`,
      [id]
    );
    
    console.log('[UPDATE] Raw DB result after update:', result);
    
    if (!result) throw new Error(`Config with id ${id} not found after update`);
    
    const parsed = this.parseConfig(result);
    console.log('[UPDATE] Parsed result after update:', parsed);
    
    return parsed;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute(
      `DELETE FROM mcp_server_configs WHERE id = ?`,
      [id]
    );
  }

  async findByName(name: string): Promise<McpServerConfig | null> {
    const row = await this.db.get<any>(
      `SELECT * FROM mcp_server_configs WHERE name = ?`,
      [name]
    );
    return row ? this.parseConfig(row) : null;
  }

  async findByTransportType(type: TransportType): Promise<McpServerConfig[]> {
    const rows = await this.db.query<any>(
      `SELECT * FROM mcp_server_configs WHERE transport_type = ?`,
      [type]
    );
    return rows.map(this.parseConfig);
  }

  async listRecent(limit: number): Promise<McpServerConfig[]> {
    console.log('[LIST_RECENT] 查询最近配置，限制:', limit);
    
    const rows = await this.db.query<any>(
      `SELECT * FROM mcp_server_configs 
       ORDER BY ROWID DESC LIMIT ?`,
      [limit]
    );
    
    console.log('[LIST_RECENT] 查询结果:', rows.map(r => ({ 
      id: r.id, 
      name: r.name, 
      rowid: r.rowid 
    })));
    
    return rows.map(row => this.parseConfig(row));
  }
}
