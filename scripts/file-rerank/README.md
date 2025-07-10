# 🔍 Jina Rerank 文件排序工具

这个工具使用 Jina AI 的 Rerank 模型，根据查询语句对文件夹中的文件内容进行智能排序。

## 📋 功能特性

- ✅ 使用 `jina-reranker-v2-base-multilingual` 多语言模型
- ✅ 支持多种文件格式 (JS, Python, Markdown, JSON, HTML, CSS)
- ✅ 批量处理大量文件
- ✅ 生成详细的排序报告
- ✅ 支持中英文查询
- ✅ 异步并行处理提高效率

## 🚀 快速开始

### 1. 准备环境

```bash
# 安装依赖
npm install axios

# 设置 Jina API Key
export JINA_API_KEY=your_jina_api_key_here
```

### 2. 生成测试数据

```bash
node scripts/generate-test-data.js
```

这会在 `scripts/test-data` 目录下生成各种类型的测试文件。

### 3. 运行文件排序

```bash
# 基本用法
node scripts/file-rerank.js "JavaScript 函数" ./scripts/test-data

# 指定输出文件
node scripts/file-rerank.js "机器学习算法" ./scripts/test-data ./my-results.json

# 查看帮助
node scripts/file-rerank.js
```

## 📊 使用示例

### 示例 1: 查找 JavaScript 相关文件
```bash
node scripts/file-rerank.js "JavaScript 函数" ./scripts/test-data
```

### 示例 2: 查找机器学习内容
```bash
node scripts/file-rerank.js "机器学习算法" ./scripts/test-data
```

### 示例 3: 查找数据分析文件
```bash
node scripts/file-rerank.js "数据分析" ./scripts/test-data
```

### 示例 4: 查找异步编程内容
```bash
node scripts/file-rerank.js "异步编程" ./scripts/test-data
```

## 📁 支持的文件类型

- `.js` - JavaScript 文件
- `.py` - Python 文件
- `.md` - Markdown 文档
- `.json` - JSON 配置文件
- `.html` - HTML 文件
- `.css` - CSS 样式文件
- `.txt` - 纯文本文件

## 📋 输出格式

工具会生成一个 JSON 格式的报告文件，包含：

```json
{
  "query": "JavaScript 函数",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalFiles": 8,
  "results": [
    {
      "rank": 1,
      "filename": "array-methods.js",
      "relevanceScore": 0.9542,
      "fileSize": "1.2 KB",
      "preview": "JavaScript 数组方法详解 - map, filter, reduce..."
    }
  ]
}
```

## 🔧 配置选项

### 环境变量
- `JINA_API_KEY` - Jina AI API 密钥（必需）

### 脚本参数
- `query` - 查询语句（必需）
- `folderPath` - 文件夹路径（必需）
- `outputPath` - 输出文件路径（可选，默认为 `./rerank-results.json`）

## 📈 性能优化

- **批处理**: 自动将大量文件分批处理，每批最多 100 个文件
- **并行请求**: 多个批次并行发送到 API，提高处理速度
- **错误处理**: 优雅处理 API 错误，不会中断整个流程
- **文件过滤**: 自动过滤掉空文件和过小的文件

## 🛠️ 故障排除

### 常见问题

1. **API Key 未设置**
   ```
   错误: 请设置 JINA_API_KEY 环境变量
   ```
   解决: 确保正确设置了环境变量

2. **文件夹不存在**
   ```
   错误: 文件夹不存在: ./some-folder
   ```
   解决: 检查文件夹路径是否正确

3. **没有找到可处理的文件**
   ```
   错误: 没有找到可处理的文件
   ```
   解决: 确保文件夹中有支持的文件类型

4. **API 调用失败**
   ```
   错误: 重排序失败: Request failed with status code 401
   ```
   解决: 检查 API Key 是否有效

### 调试技巧

1. **查看详细日志**: 脚本会输出详细的处理日志
2. **检查文件内容**: 确保文件编码为 UTF-8
3. **测试小批量**: 先用少量文件测试

## 🔗 相关资源

- [Jina AI 官网](https://jina.ai/)
- [Jina Rerank API 文档](https://docs.jina.ai/concepts/reranking/)
- [获取 API Key](https://jina.ai/reader)

## 📝 注意事项

1. **API 限制**: 每个 API Key 有调用频率限制
2. **文件大小**: 过大的文件可能影响处理速度
3. **Token 消耗**: 每次调用会消耗一定的 Token
4. **网络连接**: 需要稳定的网络连接访问 Jina API

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个工具！

## 📄 许可证

本项目采用 Apache 2.0 许可证。 