#!/bin/bash

# 深度搜索工具使用示例

echo "🔍 Jina 深度文件搜索 - 使用示例"
echo "================================"
echo ""

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    echo ""
fi

# 检查是否有测试数据
if [ ! -d "../../work_dir/test-data" ]; then
    echo "📝 生成测试数据..."
    node generate-test-data.js
    echo ""
fi

echo "开始运行示例..."
echo ""

# 示例 1: 混合模式搜索
echo "📊 示例 1: 混合模式搜索 (Rerank + Embedding)"
echo "查询: 'JavaScript 异步编程'"
node deep-search.js "JavaScript 异步编程" ../../work_dir/test-data --mode hybrid --top 5
echo ""
echo "按 Enter 继续下一个示例..."
read

# 示例 2: 仅 Rerank 模式
echo "📊 示例 2: 快速模式 (仅 Rerank)"
echo "查询: '数据结构'"
node deep-search.js "数据结构" ../../work_dir/test-data --mode rerank-only --top 5
echo ""
echo "按 Enter 继续下一个示例..."
read

# 示例 3: 仅 Embedding 模式
echo "📊 示例 3: 精确模式 (仅 Embedding)"
echo "查询: '错误处理'"
node deep-search.js "错误处理" ../../work_dir/test-data --mode embedding-only --top 5
echo ""
echo "按 Enter 继续下一个示例..."
read

# 示例 4: 禁用分块
echo "📊 示例 4: 禁用分块 (整个文件匹配)"
echo "查询: 'React Hooks'"
node deep-search.js "React Hooks" ../../work_dir/test-data --no-chunk --top 3
echo ""
echo "按 Enter 继续下一个示例..."
read

# 示例 5: 搜索实际项目代码
echo "📊 示例 5: 搜索项目源代码"
echo "查询: 'rerank embeddings'"
node deep-search.js "rerank embeddings" ../../src --mode hybrid --top 5
echo ""

echo "✅ 所有示例运行完成！"
echo ""
echo "查看详细报告: ../../work_dir/deep-search-results.json"

