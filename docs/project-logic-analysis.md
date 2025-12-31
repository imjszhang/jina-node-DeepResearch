# DeepResearch - 项目逻辑分析文档

> 创建时间: 2026-01-01  
> 最后更新: 2026-01-01  
> 当前版本: 1.0.0

## 功能简介
==========
DeepResearch 是一个基于 AI 的深度研究系统，通过迭代的搜索、阅读、推理循环来回答复杂问题。
系统使用 LLM（Gemini/OpenAI）进行推理，使用 Jina Reader 进行搜索和阅读网页内容。
核心目标是找到正确答案，而非生成长文报告。

## 核心架构
----------

### 主要组件

1. **Agent (`src/agent.ts`)** - 核心推理引擎，协调所有操作
2. **Server (`src/server.ts`)** - HTTP 服务器，提供 OpenAI 兼容 API
3. **Tools (`src/tools/`)** - 各种工具模块（搜索、阅读、评估等）
4. **Utils (`src/utils/`)** - 辅助工具（URL 处理、文本处理、token 追踪等）

### 核心工作流程

```
用户问题 → 初始化上下文 → 循环执行以下步骤直到找到答案或预算耗尽：
  ├─ 1. 选择动作（search/visit/reflect/answer/coding）
  ├─ 2. 执行动作
  ├─ 3. 更新知识库
  ├─ 4. 评估答案（如果是answer动作）
  └─ 5. 继续或结束
```

## 主要功能
--------

1. **多动作类型支持** - 支持搜索、访问、反思、回答、编程五种动作类型
2. **迭代式深度研究** - 通过搜索→阅读→推理的循环深入挖掘信息
3. **答案质量评估** - 多维度评估答案质量（确定性、时效性、完整性等）
4. **知识库管理** - 智能管理中间知识，避免重复搜索
5. **URL 智能管理** - URL 去重、排序、过滤，提高搜索效率
6. **团队协作模式** - 支持将复杂问题分解为多个子问题并行处理
7. **流式响应支持** - 实时流式输出思考过程和最终答案
8. **多语言支持** - 自动检测问题语言，支持中文、日文、英文等
9. **多搜索提供商** - 支持 Jina、DuckDuckGo、Brave、Serper
10. **Token 预算管理** - 智能管理 token 使用，预留预算用于最终答案生成

## 核心逻辑流程
----------

### 1. 主循环逻辑

主循环位于 `agent.ts:518-1034`，核心流程如下：

```typescript
while (token预算未耗尽) {
  1. 从gaps队列中选择当前问题
  2. 根据上下文生成prompt和schema
  3. LLM生成动作决策
  4. 执行动作：
     - search: 执行搜索，收集URLs
     - visit: 读取网页，提取知识
     - reflect: 生成子问题，加入gaps
     - answer: 评估答案质量
     - coding: 执行代码解决问题
  5. 更新知识库和上下文
  6. 检查是否满足结束条件
}
```

### 2. 动作类型详解

#### Search（搜索）
- 执行网络搜索，收集相关 URL
- 支持多个搜索提供商（Jina、DuckDuckGo、Brave、Serper）
- 对搜索结果进行去重和排序
- 将搜索结果加入 URL 候选列表

#### Visit（访问）
- 访问并阅读网页内容
- 使用 Jina Reader API 提取结构化内容
- 将内容加入知识库
- 支持图片提取（可选）

#### Reflect（反思）
- 分析知识缺口
- 生成子问题列表
- 将子问题加入 gaps 队列
- 避免重复问题

#### Answer（回答）
- 生成最终答案
- 执行多维度评估
- 如果评估失败，记录错误并继续搜索
- 多次失败后进入 Beast Mode

#### Coding（编程）
- 使用代码沙箱解决编程问题
- 执行 JavaScript 代码
- 将结果加入知识库

### 3. 答案评估机制

评估类型包括：

- **definitive** - 答案是否确定，无不确定性表达
- **freshness** - 信息是否足够新（根据问题类型设置时效阈值）
- **plurality** - 是否提供了足够数量的项目/例子
- **completeness** - 是否覆盖了问题中明确提到的所有方面
- **strict** - 严格审查，要求改进

评估流程：
1. 首先评估问题需要哪些评估类型
2. 对答案依次执行相应评估
3. 任一评估失败则要求重新搜索/推理
4. 多次失败后进入"Beast Mode"（强制给出答案）

### 4. 团队协作模式

当 `teamSize > 1` 时：
1. 将复杂问题分解为多个正交子问题
2. 并行处理每个子问题（递归调用 `getResponse`）
3. 合并所有子问题的答案和引用

### 5. URL 管理策略

- URL 去重与规范化
- 基于相关性评分排序
- 主机名过滤（boost/bad/only）
- 每个主机名最多保留 2 个 URL（提高多样性）

### 6. 知识库管理

知识项类型：
- `qa` - 问答对
- `side-info` - 侧边信息
- `url` - 来自网页的内容
- `coding` - 代码解决方案
- `chat-history` - 聊天历史

知识库用于：
- 构建对话上下文
- 避免重复搜索
- 提供背景信息

### 7. 流式响应机制

- 使用 Server-Sent Events (SSE)
- 将思考过程包装在 `<think>...</think>` 标签中
- 自然流式输出文本（支持 CJK 字符）
- 最后发送最终答案和引用

### 8. Token 预算管理

- 跟踪所有 LLM 调用和工具使用的 token
- 预留 15% 预算用于"Beast Mode"
- 预算耗尽时强制结束并给出最佳答案

### 9. 错误处理与恢复

- **搜索失败** - 记录失败查询，禁用搜索动作
- **访问失败** - 标记为 badURLs，跳过
- **评估失败** - 记录错误分析，重置上下文，继续尝试
- **多次失败** - 进入 Beast Mode

## 技术特点
--------

1. **多语言支持** - 自动检测问题语言，支持中文、日文、英文等
2. **多搜索提供商** - 支持 Jina、DuckDuckGo、Brave、Serper
3. **结构化输出** - 使用 Zod Schema 确保 LLM 输出格式正确
4. **引用构建** - 自动从网页内容中提取引用并匹配到答案
5. **图片支持** - 可选地处理网页中的图片并构建图片引用

## 配置系统
--------

- 支持多种 LLM 提供商（Gemini、OpenAI、Vertex）
- 可配置的工具参数（temperature、maxTokens 等）
- 环境变量管理
- 代理支持

## API 接口
--------

提供 OpenAI 兼容的 API：
- `POST /v1/chat/completions` - 主要接口
- `GET /v1/models` - 列出可用模型
- 支持流式和非流式响应
- 可选的 Bearer Token 认证

## 关键文件说明
----------

### 核心文件

- `src/agent.ts` - 核心代理逻辑，包含主循环和动作执行
- `src/server.ts` - HTTP 服务器，处理 API 请求
- `src/app.ts` - Express 应用配置
- `src/config.ts` - 配置管理
- `src/types.ts` - TypeScript 类型定义

### 工具模块

- `src/tools/jina-search.ts` - Jina 搜索实现
- `src/tools/read.ts` - 网页阅读实现
- `src/tools/evaluator.ts` - 答案评估实现
- `src/tools/research-planner.ts` - 研究规划（团队协作）
- `src/tools/finalizer.ts` - 答案最终化处理
- `src/tools/build-ref.ts` - 引用构建

### 工具模块

- `src/utils/token-tracker.ts` - Token 使用追踪
- `src/utils/action-tracker.ts` - 动作追踪
- `src/utils/url-tools.ts` - URL 处理工具
- `src/utils/text-tools.ts` - 文本处理工具
- `src/utils/schemas.ts` - Zod Schema 定义

## 使用方法
--------

### 基本使用

```bash
# 设置环境变量
export GEMINI_API_KEY=...
export JINA_API_KEY=...

# 运行代理
npm run dev "你的问题"
```

### API 使用

```bash
# 启动服务器
npm run serve

# 调用 API
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jina-deepsearch-v1",
    "messages": [{"role": "user", "content": "你的问题"}],
    "stream": true
  }'
```

## CHANGELOG
==========

## [1.0.0] - 2026-01-01

### 新增
- ✨ 初始版本发布
- ✨ 核心代理逻辑实现
- ✨ 多动作类型支持（搜索、访问、反思、回答、编程）
- ✨ 答案质量评估机制
- ✨ 团队协作模式
- ✨ 流式响应支持
- ✨ OpenAI 兼容 API

## 版本说明
--------
- **主版本号** (x.0.0): 不兼容的 API 变更
- **次版本号** (0.x.0): 新增功能，向后兼容
- **修订号** (0.0.x): 问题修复和小改进
