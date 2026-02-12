# 云函数部署指南

## 📦 云函数列表

本项目共有4个云函数需要部署：

1. **login** - 用户登录
2. **setStatus** - 设置状态
3. **clearExpiredStatus** - 清理过期状态（定时触发）
4. **getMyRecords** - 获取历史记录

---

## 🚀 部署步骤

### 方式一：使用微信开发者工具部署（推荐）

#### 1. 初始化云函数目录
1. 在微信开发者工具中打开项目
2. 点击工具栏的"云开发"按钮
3. 开通云开发环境（如果还未开通）
4. 记录环境ID（例如：cloud1-xxx）

#### 2. 配置环境ID
在 `app.js` 中找到这一行：
```javascript
env: 'your-env-id',  // 替换为你的云开发环境ID
```
替换为你的实际环境ID，例如：
```javascript
env: 'cloud1-xxx',
```

#### 3. 部署单个云函数
1. 右键点击 `cloudfunctions/login` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成（约30秒-1分钟）

重复以上步骤，依次部署：
- `setStatus`
- `clearExpiredStatus`
- `getMyRecords`

#### 4. 配置定时触发器（重要）
`clearExpiredStatus` 需要配置定时触发器：

**方法A - 使用配置文件（推荐）**
- 云函数已配置 `config.json`，包含触发器设置
- 部署时会自动创建定时触发器
- 触发规则：`0 */5 * * * * *`（每5分钟执行一次）

**方法B - 手动配置**
1. 打开云开发控制台
2. 进入"云函数" → "clearExpiredStatus"
3. 点击"触发器"标签
4. 点击"添加触发器"
5. 填写配置：
   - 触发器名称：clearExpiredStatusTrigger
   - 触发周期：自定义触发周期
   - Cron表达式：`0 */5 * * * * *`
6. 保存

---

### 方式二：使用命令行部署

#### 1. 安装云开发CLI工具
```bash
npm install -g @cloudbase/cli
```

#### 2. 登录
```bash
tcb login
```

#### 3. 部署所有云函数
```bash
cd cloudfunctions

# 部署login
cd login
npm install --production
tcb fn deploy login --envId your-env-id

# 部署setStatus
cd ../setStatus
npm install --production
tcb fn deploy setStatus --envId your-env-id

# 部署clearExpiredStatus
cd ../clearExpiredStatus
npm install --production
tcb fn deploy clearExpiredStatus --envId your-env-id

# 部署getMyRecords
cd ../getMyRecords
npm install --production
tcb fn deploy getMyRecords --envId your-env-id
```

---

## ✅ 验证部署

### 1. 检查云函数列表
1. 打开云开发控制台
2. 进入"云函数"页面
3. 确认所有4个云函数都已显示

### 2. 测试云函数

#### 测试 login
在云开发控制台点击"测试"，无需参数，应返回：
```json
{
  "success": true,
  "openid": "oxxxx-xxxxxx"
}
```

#### 测试 setStatus
输入测试参数：
```json
{
  "statusId": 1,
  "duration": 30
}
```
应返回：
```json
{
  "success": true,
  "message": "状态已更新"
}
```

#### 测试 clearExpiredStatus
无需参数，点击测试，应返回：
```json
{
  "success": true,
  "count": 0,
  "message": "没有过期状态需要清理"
}
```

#### 测试 getMyRecords
输入测试参数：
```json
{
  "page": 1,
  "pageSize": 20
}
```
应返回：
```json
{
  "success": true,
  "data": [],
  "hasMore": false,
  "total": 0
}
```

### 3. 检查定时触发器
1. 进入云开发控制台
2. 点击 "clearExpiredStatus" 云函数
3. 查看"触发器"标签
4. 确认触发器已创建并启用
5. 查看"运行日志"，等待5分钟后查看是否有自动执行记录

---

## 🗄️ 数据库配置

### 1. 创建集合
在云开发控制台 → 数据库，创建两个集合：

#### users 集合
```javascript
// 示例文档结构
{
  "_id": "自动生成",
  "openId": "oxxxx-xxxxxx",
  "currentStatus": 1,
  "statusStartTime": ISODate("2025-02-09T10:00:00Z"),
  "statusEndTime": ISODate("2025-02-09T10:30:00Z"),
  "lastUpdateTime": ISODate("2025-02-09T10:00:00Z"),
  "createdAt": ISODate("2025-02-09T09:00:00Z"),
  "updatedAt": ISODate("2025-02-09T10:00:00Z")
}
```

#### status_records 集合
```javascript
// 示例文档结构
{
  "_id": "自动生成",
  "userId": "oxxxx-xxxxxx",
  "statusId": 1,
  "statusName": "撸铁",
  "startTime": ISODate("2025-02-09T10:00:00Z"),
  "endTime": ISODate("2025-02-09T10:30:00Z"),
  "duration": 30,
  "createdAt": ISODate("2025-02-09T10:30:00Z")
}
```

### 2. 创建索引（重要，提升性能）

#### users 集合索引
进入 users 集合 → 索引管理 → 添加索引：

**索引1**：
- 字段：`openId`
- 排序：升序
- 唯一：是

**索引2**：
- 字段：`currentStatus` + `statusEndTime`
- 排序：升序 + 升序
- 唯一：否

#### status_records 集合索引
进入 status_records 集合 → 索引管理 → 添加索引：

**索引1**：
- 字段：`userId` + `startTime`
- 排序：升序 + 降序
- 唯一：否

### 3. 设置权限（开发阶段）
建议设置：
- **users**：所有用户可读，仅创建者可写
- **status_records**：所有用户可读，仅创建者可写

生产环境建议使用自定义安全规则。

---

## 🐛 常见问题

### 1. 云函数部署失败
**原因**：可能是网络问题或依赖安装失败  
**解决**：
- 检查网络连接
- 重新部署
- 查看云函数日志

### 2. 定时触发器不执行
**原因**：触发器未启用或配置错误  
**解决**：
- 检查触发器是否启用
- 验证Cron表达式是否正确
- 查看运行日志

### 3. 数据库查询失败
**原因**：索引未创建或权限设置错误  
**解决**：
- 创建必要的索引
- 检查数据库权限设置
- 查看云函数日志

### 4. OpenID获取失败
**原因**：用户未授权或云函数未正确初始化  
**解决**：
- 检查云开发环境ID是否正确
- 确认用户已登录小程序
- 查看云函数日志

---

## 📊 监控和日志

### 查看云函数日志
1. 云开发控制台 → 云函数
2. 点击具体云函数
3. 查看"运行日志"标签
4. 筛选时间范围和日志级别

### 监控指标
关注以下指标：
- **调用次数**：是否有异常峰值
- **错误率**：是否超过1%
- **平均耗时**：是否超过1秒
- **定时触发器执行**：是否按时执行

---

## 🚀 部署完成后

完成以上所有步骤后，你的小程序应该可以：
1. ✅ 用户登录并自动创建账户
2. ✅ 设置和切换状态
3. ✅ 实时查看各状态人数
4. ✅ 查看历史记录
5. ✅ 自动清理过期状态

祝你部署顺利！🎉
