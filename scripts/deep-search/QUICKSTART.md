# 🚀 快速开始指南

5 分钟上手 Jina 深度文件搜索工具！

> 💡 **使用的模型**：本工具使用 [Jina Reranker M0](https://jina.ai?sui=reranker&model=jina-reranker-m0)（世界级重排序模型）+ Jina Embeddings v3，提供业界领先的搜索质量。

## 第一步：安装依赖

```bash
cd scripts/deep-search
npm install
```

## 第二步：配置 API Key

在项目根目录创建 `.env` 文件：

```bash
# 返回项目根目录
cd ../..

# 创建 .env 文件
echo "JINA_API_KEY=your_jina_api_key_here" > .env
```

> 💡 获取 API Key: https://jina.ai/reader

## 第三步：生成测试数据

```bash
cd scripts/deep-search
npm run generate
```

这会在 `work_dir/test-data` 目录生成 8 个测试文件，包含：
- JavaScript 异步编程示例
- 数据结构实现
- TypeScript 错误处理
- React Hooks 用法
- API 文档
- 数据库配置
- Python 机器学习代码

## 第四步：运行第一次搜索

### 方式 1: 使用 npm 脚本（推荐）

```bash
# 混合模式搜索
npm run test-hybrid

# 快速模式（仅 Rerank）
npm run test-rerank

# 精确模式（仅 Embedding）
npm run test-embedding
```

### 方式 2: 直接使用命令

```bash
# 基本搜索
node deep-search.js "JavaScript 异步编程" ../../work_dir/test-data

# 指定模式
node deep-search.js "数据结构" ../../work_dir/test-data --mode hybrid

# 返回更多结果
node deep-search.js "错误处理" ../../work_dir/test-data --top 20
```

## 第五步：查看结果

搜索完成后，你会看到：

```
🏆 搜索结果 (按相关性排序):

1. 📄 async-programming.js
   路径: async-programming.js
   最终得分: 0.9234 (hybrid-chunk)
   Rerank 分数: 0.8956
   Embedding 分数: 0.9412
   匹配片段: async function getUserProfile(userId) { ... }
   位置: 450-950

2. 📄 error-handling.ts
   ...
```

详细报告保存在：`work_dir/deep-search-results.json`

## 第六步：运行性能测试（可选）

```bash
# 对比不同模式的性能
npm run bench-test

# 或自定义测试
node benchmark.js "React Hooks" ../../work_dir/test-data
```

## 🎯 实际使用场景

### 场景 1: 搜索项目源代码

```bash
# 搜索整个 src 目录
node deep-search.js "WebSocket 实时通信" ../../src --recursive

# 搜索特定功能实现
node deep-search.js "用户认证逻辑" ../../src/auth --mode hybrid
```

### 场景 2: 查找文档

```bash
# 搜索 API 文档
node deep-search.js "REST API 端点" ../../docs --mode embedding-only

# 搜索配置说明
node deep-search.js "环境变量配置" ../../ --recursive --top 5
```

### 场景 3: 代码审查

```bash
# 查找需要重构的代码
node deep-search.js "TODO FIXME" ../../src --recursive --top 20

# 查找错误处理
node deep-search.js "try catch error handling" ../../src --mode hybrid
```

## 📊 三种模式对比

| 模式 | 速度 | 精度 | 使用模型 | 适用场景 |
|------|------|------|----------|----------|
| **rerank-only** | ⚡⚡⚡ 最快 | ⭐⭐⭐ 好 | Reranker M0 | 快速筛选大量文件 |
| **embedding-only** | ⚡⚡ 中等 | ⭐⭐⭐⭐ 最准 | Embeddings v3 | 深度语义理解 |
| **hybrid** | ⚡⚡ 中等 | ⭐⭐⭐⭐⭐ 卓越 | M0 + v3 | 平衡速度与精度（推荐） |

> 💡 **推荐**：混合模式结合了 Reranker M0 的快速筛选和 Embeddings v3 的精准匹配，在大多数场景下表现最佳。

## 💡 使用技巧

### 1. 选择合适的模式

```bash
# 小项目（< 50 文件）- 使用精确模式
node deep-search.js "query" ./small-project --mode embedding-only

# 中型项目（50-200 文件）- 使用混合模式
node deep-search.js "query" ./medium-project --mode hybrid

# 大型项目（> 200 文件）- 使用快速模式
node deep-search.js "query" ./large-project --mode rerank-only --top 20
```

### 2. 调整参数优化性能

```bash
# 增加 Rerank 保留数量，提高召回率
node deep-search.js "query" ./src --rerank-top 100 --top 20

# 禁用分块，按整个文件搜索
node deep-search.js "query" ./src --no-chunk

# 递归搜索所有子目录
node deep-search.js "query" ./project --recursive
```

### 3. 优化查询语句

```bash
# ❌ 不好：太宽泛
node deep-search.js "函数" ./src

# ✅ 好：具体明确
node deep-search.js "异步函数错误处理" ./src

# ✅ 好：使用技术术语
node deep-search.js "WebSocket 连接池管理" ./src
```

## 🔧 常见问题

### Q: 搜索速度太慢？
A: 尝试以下方法：
- 使用 `--mode rerank-only`
- 减少 `--rerank-top` 的值
- 不使用 `--recursive`

### Q: 结果不够准确？
A: 尝试以下方法：
- 使用 `--mode embedding-only`
- 使用更具体的查询语句
- 增加 `--rerank-top` 的值

### Q: 内存不足？
A: 增加 Node.js 内存限制：
```bash
NODE_OPTIONS="--max-old-space-size=4096" node deep-search.js "query" ./src
```

## 📚 下一步

- 阅读完整文档：[README.md](./README.md)
- 了解架构设计：[ARCHITECTURE.md](./ARCHITECTURE.md)
- 查看 API 参考：了解所有可用选项
- 运行性能测试：对比不同模式的效果
- 集成到你的工作流：创建自定义脚本
- 了解模型选择：查看为什么使用 Jina Reranker M0

## 🎉 完成！

现在你已经掌握了基本用法，可以开始在实际项目中使用深度搜索工具了！

有问题？查看 [README.md](./README.md) 或提交 Issue。

