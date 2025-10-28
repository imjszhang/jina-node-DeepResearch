const fs = require('fs');
const path = require('path');

// 测试数据目录
const TEST_DATA_DIR = path.join(__dirname, '../../work_dir/test-data');

// 测试文件内容
const testFiles = [
  {
    filename: 'async-programming.js',
    content: `// JavaScript 异步编程示例

// 使用 Promise 处理异步操作
function fetchUserData(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userId > 0) {
        resolve({ id: userId, name: 'John Doe', email: 'john@example.com' });
      } else {
        reject(new Error('Invalid user ID'));
      }
    }, 1000);
  });
}

// 使用 async/await 简化异步代码
async function getUserProfile(userId) {
  try {
    const user = await fetchUserData(userId);
    console.log('User profile:', user);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Promise.all 并行处理多个异步操作
async function fetchMultipleUsers(userIds) {
  const promises = userIds.map(id => fetchUserData(id));
  const users = await Promise.all(promises);
  return users;
}

// 错误处理和重试机制
async function fetchWithRetry(userId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchUserData(userId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(\`Retry \${i + 1}/\${maxRetries}\`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = { fetchUserData, getUserProfile, fetchMultipleUsers, fetchWithRetry };
`
  },
  {
    filename: 'data-structures.js',
    content: `// 常用数据结构实现

// 栈（Stack）- 后进先出（LIFO）
class Stack {
  constructor() {
    this.items = [];
  }

  push(element) {
    this.items.push(element);
  }

  pop() {
    if (this.isEmpty()) return null;
    return this.items.pop();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}

// 队列（Queue）- 先进先出（FIFO）
class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(element) {
    this.items.push(element);
  }

  dequeue() {
    if (this.isEmpty()) return null;
    return this.items.shift();
  }

  front() {
    if (this.isEmpty()) return null;
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}

// 链表（Linked List）
class Node {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  add(data) {
    const newNode = new Node(data);
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
  }

  remove(data) {
    if (!this.head) return false;
    
    if (this.head.data === data) {
      this.head = this.head.next;
      this.size--;
      return true;
    }

    let current = this.head;
    while (current.next) {
      if (current.next.data === data) {
        current.next = current.next.next;
        this.size--;
        return true;
      }
      current = current.next;
    }
    return false;
  }
}

module.exports = { Stack, Queue, LinkedList };
`
  },
  {
    filename: 'error-handling.ts',
    content: `// TypeScript 错误处理最佳实践

// 自定义错误类
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(\`\${resource} not found\`, 404);
  }
}

// 错误处理中间件
interface ErrorHandler {
  handle(error: Error): void;
}

class LoggerErrorHandler implements ErrorHandler {
  handle(error: Error): void {
    console.error('Error occurred:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

// Try-Catch 包装器
async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error as Error);
    } else {
      console.error('Unhandled error:', error);
    }
    return null;
  }
}

// Result 模式（函数式错误处理）
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

function ok<T>(value: T): Result<T> {
  return { success: true, value };
}

function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// 使用示例
async function fetchData(url: string): Promise<Result<any>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return err(new Error(\`HTTP error! status: \${response.status}\`));
    }
    const data = await response.json();
    return ok(data);
  } catch (error) {
    return err(error as Error);
  }
}

export { AppError, ValidationError, NotFoundError, tryCatch, Result, ok, err, fetchData };
`
  },
  {
    filename: 'react-hooks.tsx',
    content: `// React Hooks 使用指南

import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';

// useState - 状态管理
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <input value={name} onChange={(e) => setName(e.target.value)} />
    </div>
  );
}

// useEffect - 副作用处理
function DataFetcher({ userId }: { userId: number }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const result = await response.json();
        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    // 清理函数
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
}

// useCallback - 记忆化回调函数
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    const response = await fetch(\`/api/search?q=\${searchQuery}\`);
    const data = await response.json();
    setResults(data);
  }, []);

  useEffect(() => {
    if (query) {
      handleSearch(query);
    }
  }, [query, handleSearch]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {results.map((item: any) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

// useMemo - 记忆化计算结果
function ExpensiveComponent({ items }: { items: number[] }) {
  const total = useMemo(() => {
    console.log('Calculating total...');
    return items.reduce((sum, item) => sum + item, 0);
  }, [items]);

  return <div>Total: {total}</div>;
}

// useRef - 引用 DOM 元素或保存可变值
function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={handleFocus}>Focus Input</button>
    </div>
  );
}

// 自定义 Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

export { Counter, DataFetcher, SearchComponent, ExpensiveComponent, FocusInput, useLocalStorage };
`
  },
  {
    filename: 'api-documentation.md',
    content: `# REST API 文档

## 概述

这是一个 RESTful API 服务，提供用户管理、数据查询和文件上传等功能。

## 基础信息

- **Base URL**: \`https://api.example.com/v1\`
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 认证

所有 API 请求都需要在 Header 中包含认证 Token：

\`\`\`
Authorization: Bearer YOUR_ACCESS_TOKEN
\`\`\`

## 端点列表

### 用户管理

#### 获取用户列表

\`\`\`
GET /users
\`\`\`

**查询参数**:
- \`page\` (number): 页码，默认 1
- \`limit\` (number): 每页数量，默认 20
- \`sort\` (string): 排序字段，默认 'createdAt'

**响应示例**:
\`\`\`json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
\`\`\`

#### 创建用户

\`\`\`
POST /users
\`\`\`

**请求体**:
\`\`\`json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "secure_password"
}
\`\`\`

**响应示例**:
\`\`\`json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
}
\`\`\`

#### 更新用户

\`\`\`
PUT /users/:id
\`\`\`

#### 删除用户

\`\`\`
DELETE /users/:id
\`\`\`

### 数据查询

#### 搜索

\`\`\`
GET /search
\`\`\`

**查询参数**:
- \`q\` (string): 搜索关键词
- \`type\` (string): 搜索类型 (users, posts, comments)
- \`limit\` (number): 结果数量

### 文件上传

#### 上传文件

\`\`\`
POST /upload
\`\`\`

**Content-Type**: \`multipart/form-data\`

**表单字段**:
- \`file\`: 文件对象
- \`description\`: 文件描述

## 错误处理

API 使用标准 HTTP 状态码：

- \`200\`: 成功
- \`201\`: 创建成功
- \`400\`: 请求参数错误
- \`401\`: 未授权
- \`403\`: 禁止访问
- \`404\`: 资源不存在
- \`500\`: 服务器错误

**错误响应格式**:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  }
}
\`\`\`

## 速率限制

- 每个 IP 每小时最多 1000 次请求
- 超过限制返回 429 状态码

## 示例代码

### JavaScript/Node.js

\`\`\`javascript
const axios = require('axios');

async function getUsers() {
  const response = await axios.get('https://api.example.com/v1/users', {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  });
  return response.data;
}
\`\`\`

### Python

\`\`\`python
import requests

def get_users():
    response = requests.get(
        'https://api.example.com/v1/users',
        headers={'Authorization': 'Bearer YOUR_TOKEN'}
    )
    return response.json()
\`\`\`
`
  },
  {
    filename: 'database-config.json',
    content: JSON.stringify({
      development: {
        host: 'localhost',
        port: 5432,
        database: 'myapp_dev',
        username: 'dev_user',
        password: 'dev_password',
        dialect: 'postgres',
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      },
      production: {
        host: process.env.DB_HOST || 'db.example.com',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'myapp_prod',
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        dialect: 'postgres',
        pool: {
          max: 20,
          min: 5,
          acquire: 30000,
          idle: 10000
        },
        ssl: true
      }
    }, null, 2)
  },
  {
    filename: 'machine-learning.py',
    content: `# 机器学习基础示例

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# 数据预处理
def preprocess_data(X, y):
    """
    数据预处理：标准化和分割
    """
    # 标准化特征
    X_mean = np.mean(X, axis=0)
    X_std = np.std(X, axis=0)
    X_normalized = (X - X_mean) / X_std
    
    # 分割训练集和测试集
    X_train, X_test, y_train, y_test = train_test_split(
        X_normalized, y, test_size=0.2, random_state=42
    )
    
    return X_train, X_test, y_train, y_test

# 线性回归模型
class SimpleLinearRegression:
    def __init__(self):
        self.weights = None
        self.bias = None
    
    def fit(self, X, y, learning_rate=0.01, epochs=1000):
        """
        使用梯度下降训练模型
        """
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0
        
        for epoch in range(epochs):
            # 预测
            y_pred = np.dot(X, self.weights) + self.bias
            
            # 计算梯度
            dw = (1/n_samples) * np.dot(X.T, (y_pred - y))
            db = (1/n_samples) * np.sum(y_pred - y)
            
            # 更新参数
            self.weights -= learning_rate * dw
            self.bias -= learning_rate * db
            
            # 每100轮打印一次损失
            if epoch % 100 == 0:
                loss = np.mean((y_pred - y) ** 2)
                print(f'Epoch {epoch}, Loss: {loss:.4f}')
    
    def predict(self, X):
        """
        预测
        """
        return np.dot(X, self.weights) + self.bias

# 模型评估
def evaluate_model(y_true, y_pred):
    """
    评估模型性能
    """
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    
    print(f'Mean Squared Error: {mse:.4f}')
    print(f'Root Mean Squared Error: {rmse:.4f}')
    print(f'R² Score: {r2:.4f}')
    
    return {'mse': mse, 'rmse': rmse, 'r2': r2}

# 交叉验证
from sklearn.model_selection import cross_val_score

def cross_validate_model(model, X, y, cv=5):
    """
    K折交叉验证
    """
    scores = cross_val_score(model, X, y, cv=cv, scoring='neg_mean_squared_error')
    rmse_scores = np.sqrt(-scores)
    
    print(f'Cross-validation RMSE scores: {rmse_scores}')
    print(f'Mean RMSE: {rmse_scores.mean():.4f}')
    print(f'Standard deviation: {rmse_scores.std():.4f}')
    
    return rmse_scores

# 特征工程
def feature_engineering(df):
    """
    特征工程：创建新特征
    """
    # 多项式特征
    df['feature_squared'] = df['feature'] ** 2
    df['feature_cubed'] = df['feature'] ** 3
    
    # 交互特征
    df['feature_interaction'] = df['feature1'] * df['feature2']
    
    # 对数变换
    df['feature_log'] = np.log1p(df['feature'])
    
    return df

if __name__ == '__main__':
    # 生成示例数据
    np.random.seed(42)
    X = np.random.randn(100, 3)
    y = 2 * X[:, 0] + 3 * X[:, 1] - X[:, 2] + np.random.randn(100) * 0.1
    
    # 训练模型
    X_train, X_test, y_train, y_test = preprocess_data(X, y)
    model = SimpleLinearRegression()
    model.fit(X_train, y_train)
    
    # 评估
    y_pred = model.predict(X_test)
    evaluate_model(y_test, y_pred)
`
  }
];

/**
 * 生成测试数据
 */
function generateTestData() {
  console.log('📁 创建测试数据目录...');
  
  // 创建目录
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    console.log(`✅ 创建目录: ${TEST_DATA_DIR}`);
  } else {
    console.log(`📂 目录已存在: ${TEST_DATA_DIR}`);
  }

  console.log('\n📝 生成测试文件...\n');

  // 生成文件
  let successCount = 0;
  let errorCount = 0;

  for (const file of testFiles) {
    try {
      const filePath = path.join(TEST_DATA_DIR, file.filename);
      fs.writeFileSync(filePath, file.content, 'utf8');
      console.log(`✅ ${file.filename} (${(file.content.length / 1024).toFixed(2)} KB)`);
      successCount++;
    } catch (error) {
      console.error(`❌ 生成 ${file.filename} 失败:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n✅ 完成！成功生成 ${successCount} 个文件`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} 个文件生成失败`);
  }
  console.log(`\n📁 测试数据位置: ${TEST_DATA_DIR}`);
  console.log('\n现在可以运行搜索命令测试：');
  console.log(`  node deep-search.js "异步编程" ${TEST_DATA_DIR}`);
  console.log(`  node deep-search.js "数据结构" ${TEST_DATA_DIR} --mode hybrid`);
  console.log(`  node deep-search.js "错误处理" ${TEST_DATA_DIR} --mode embedding-only\n`);
}

// 运行
if (require.main === module) {
  generateTestData();
}

module.exports = { generateTestData, testFiles };

