#!/bin/bash

# Jina Rerank 文件排序工具演示脚本

echo "🚀 Jina Rerank 文件排序工具演示"
echo "=================================="

# 检查是否设置了 API Key
if [ -z "$JINA_API_KEY" ]; then
    echo "❌ 错误: 请先设置 JINA_API_KEY 环境变量"
    echo "   export JINA_API_KEY=your_api_key_here"
    exit 1
fi

# 检查是否安装了 axios
if ! node -e "require('axios')" 2>/dev/null; then
    echo "📦 安装依赖..."
    npm install axios
fi

# 生成测试数据
echo "📁 生成测试数据..."
node generate-test-data.js

echo ""
echo "🔍 开始演示不同查询的排序效果..."
echo ""

# 演示不同的查询
queries=(
    "JavaScript 函数"
    "机器学习算法"
    "数据分析"
    "异步编程"
    "DOM 操作"
    "API 文档"
)

for query in "${queries[@]}"; do
    echo "─────────────────────────────────────────────────"
    echo "🎯 查询: $query"
    echo "─────────────────────────────────────────────────"
    
    # 运行查询
    node file-rerank.js "$query" ./test-data "./results-$(echo "$query" | tr ' ' '-').json"
    
    echo ""
    echo "⏱️  等待 2 秒..."
    sleep 2
done

echo ""
echo "✅ 演示完成！"
echo "📋 查看生成的结果文件："
ls -la results-*.json 2>/dev/null || echo "   没有生成结果文件"

echo ""
echo "💡 提示："
echo "   - 查看详细结果: cat results-JavaScript-函数.json"
echo "   - 自定义查询: node file-rerank.js \"你的查询\" ./test-data"
echo "   - 查看帮助: node file-rerank.js" 