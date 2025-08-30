# CCProxy - Claude Code 到 Litellm 代理服务

## 项目概述

CCProxy 是一个基于 Next.js 的全栈代理服务，主要功能是将 Claude Code 客户端的请求透明转发到 Litellm 服务。

### 核心功能

- 透明代理 Claude Code 请求到 Litellm
- 原样转发客户端请求头和响应头
- 基于客户端 ANTHROPIC_AUTH_TOKEN 的用户认证
- 无状态代理服务设计
- Docker 容器化部署

## 开发规范

### 基本规范

- **代码注释**: 所有代码注释必须使用英文
- **配置分离**: `config/` 目录下只放配置文件，不编写业务逻辑代码
- **代码格式**:
  - 输出空行中不要多余的空格，仅保留无空格的空行
  - 输出文件末尾必须包含换行符
- **无数据库**: 项目是无状态代理服务，无需数据库
- **错误处理**: 使用适当的 HTTP 状态码和错误处理
- **配置逻辑**: 业务逻辑与配置逻辑严格分离

### 开发环境

- **运行环境**: 仅使用 Docker 进行开发和运行
- **配置文件**: 使用 YAML 格式，优先通过配置文件而非环境变量配置

## 项目结构

```tree
ccproxy/
├── config/
│   └── config.yaml                 # 主配置文件
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts        # 健康检查端点
│   │   │   └── proxy/
│   │   │       └── [...path]/
│   │   │           └── route.ts    # 代理路由 (捕获所有路径)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       └── config.ts               # 配置加载工具
├── docker-compose.yml              # 生产环境配置
├── docker-compose.override.yml     # 开发环境配置
├── Dockerfile                      # Docker 构建文件
├── startup_dev.sh                  # 开发环境启动脚本
└── package.json
```

## 配置说明

### config/config.yaml

```yaml
litellm:
  base_url: 'https://api.litellm.ai' # Litellm 服务地址
  timeout: 30000 # 请求超时时间 (毫秒)

proxy:
  forward_headers: true # 是否转发客户端请求头
  forward_response_headers: true # 是否转发服务端响应头

server:
  port: 3000 # 服务端口
  host: '0.0.0.0' # 监听地址
```

### 配置加载

配置通过 `src/lib/config.ts` 加载，支持缓存机制：

```typescript
import { loadConfig } from '@/lib/config';
const config = loadConfig();
```

## API 说明

### 代理端点

**路径**: `/api/proxy/[...path]`

**功能**: 捕获所有 `/api/proxy/*` 路径的请求并转发到 Litellm

**支持方法**: GET, POST, PUT, PATCH, DELETE, OPTIONS

**请求流程**:

1. 接收 Claude Code 客户端请求
2. 提取路径并构建目标 URL
3. 转发客户端请求头（包含 Authorization）
4. 发送请求到 Litellm
5. 转发 Litellm 响应头和内容
6. 返回给客户端

**示例**:

- 客户端请求: `POST /api/proxy/chat/completions`
- 转发到: `POST {litellm.base_url}/chat/completions`

### 健康检查

**路径**: `/api/health`

**方法**: GET

**响应**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "ccproxy"
}
```

## 认证机制

### ANTHROPIC_AUTH_TOKEN 流程

1. Claude Code 客户端在请求头中发送 `Authorization: Bearer <ANTHROPIC_AUTH_TOKEN>`
2. 代理服务透明转发此认证头到 Litellm
3. Litellm 根据 token 识别和认证用户
4. 无需在代理层存储或处理认证信息

## 开发指南

### 环境要求

- Docker 和 Docker Compose
- Node.js 18+ (用于本地开发)

### 启动开发环境

```bash
# 使用启动脚本
./startup_dev.sh

# 或直接使用 docker compose
docker compose up --build
```

### 开发环境特性

- 自动代码热重载
- 源代码卷挂载
- Node.js 调试端口 (9229)
- 开发模式配置

### 生产环境部署

```bash
# 仅使用生产配置
docker compose -f docker-compose.yml up --build
```

### 构建验证

```bash
npm run build
```

## Docker 配置

### 开发环境 (docker-compose.override.yml)

- 端口: 3000 (应用), 9229 (调试)
- 卷挂载: 源代码实时同步
- 命令: `npm run dev`

### 生产环境 (docker-compose.yml)

- 端口: 3000
- 健康检查: `/` 端点
- 只读配置文件挂载

## 错误处理

### 常见错误状态码

- `500`: 内部服务器错误
- `504`: 请求超时
- 其他状态码透传自 Litellm

### 日志记录

代理错误会记录到控制台，包含错误详情和请求上下文。

## 测试

### 健康检查测试

```bash
curl http://localhost:3000/api/health
```

### 代理功能测试

```bash
curl -X POST http://localhost:3000/api/proxy/chat/completions \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3", "messages": [{"role": "user", "content": "Hello"}]}'
```

## 故障排除

### 常见问题

1. **配置文件加载失败**

   - 检查 `config/config.yaml` 文件格式
   - 确认文件路径正确

2. **代理请求失败**

   - 验证 Litellm 服务地址配置
   - 检查网络连接
   - 确认客户端认证头格式

3. **Docker 构建问题**
   - 清理 Docker 缓存: `docker system prune`
   - 重新构建: `docker compose build --no-cache`

### 开发工具

- **ESLint**: 代码质量检查 (`npm run lint`)
- **TypeScript**: 类型检查 (构建时自动执行)
- **Turbopack**: 快速构建和开发 (Next.js 15.5.2)
