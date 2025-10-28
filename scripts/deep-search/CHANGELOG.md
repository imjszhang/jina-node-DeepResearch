# 更新日志

## [1.1.0] - 2025-10-28

### 🚀 升级到 Jina Reranker v3

#### 新增
- 升级到最新的 `jina-reranker-v3` 模型
- 支持 Listwise 排序机制，实现文档间深度交互
- 更强的多语言支持（26+ 种语言）

#### 改进
- **性能提升**：v3 模型在 BEIR 基准上达到 61.94 nDCG@10，超越 v2 的 57.06
- **稳定性增强**：Top-10 结果极其稳定，不受输入顺序影响
- **更好的语义理解**：采用 "last but not late" 交互机制
- **参数效率**：仅 0.6B 参数，性能超越 4B 参数的模型

#### 技术细节
- v3 使用因果自注意力机制，所有文档在编码阶段就能相互交互
- 支持最多 64 个文档的一次性 Listwise 排序
- 上下文长度：131,072 tokens

### 对比 v2 vs v3

| 指标 | v2 (jina-reranker-v2-base-multilingual) | v3 (jina-reranker-v3) |
|------|----------------------------------------|----------------------|
| 参数量 | 0.3B | 0.6B |
| BEIR nDCG@10 | 57.06 | 61.94 ⬆️ |
| MIRACL | 63.65 | 66.83 ⬆️ |
| MKQA | 67.90 | 67.92 ⬆️ |
| CoIR | 56.14 | 70.64 ⬆️ |
| 排序方式 | Pairwise | Listwise |
| 文档交互 | 无 | 深度交互 |

### 使用建议

v3 模型在以下场景表现更好：
- ✅ 需要理解文档间关系的场景
- ✅ 多语言混合搜索
- ✅ 对 Top-K 结果质量要求高的场景
- ✅ 需要稳定排序结果的应用

### 迁移指南

从 v2 迁移到 v3 非常简单，API 完全兼容：

```javascript
// 旧代码（v2）
const request = {
  model: 'jina-reranker-v2-base-multilingual',
  query: query,
  documents: documents
};

// 新代码（v3）- 只需修改模型名称
const request = {
  model: 'jina-reranker-v3',
  query: query,
  documents: documents
};
```

无需修改其他代码，即可享受 v3 带来的性能提升！

---

## [1.0.0] - 2025-10-28

### 初始版本
- 实现深度文件搜索功能
- 支持三种搜索模式：Hybrid、Rerank-Only、Embedding-Only
- 智能文本分块
- 性能基准测试工具
- 完整的文档和示例

