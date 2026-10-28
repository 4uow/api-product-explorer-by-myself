# 商品探索器：第一个 API 学习项目

这是一个无需构建工具的原生 JavaScript 项目，使用 DummyJSON Products API 获取商品数据。项目用于学习，不是正式商品交易页面。

## 运行项目

在这个目录打开终端并启动本地静态服务器：

    py -m http.server 5500

然后访问 http://localhost:5500。也可以在 VS Code 中使用 Live Server。

## 推荐学习顺序

1. 打开 app.js，先读 loadProducts：它负责发请求、读取响应、更新状态。
2. 读 buildProductsUrl：观察搜索词、分页、排序怎样变成 URL 参数。
3. 读 requestJson：理解 fetch、HTTP 状态码和 response.json()。
4. 读 renderProducts：把接口返回的 products 数组变成商品卡片。
5. 打开浏览器开发者工具的 Network 面板，搜索商品并检查 URL、状态码、响应数据。
6. 暂时把 API_BASE 改错，观察错误提示，再恢复正确地址。

## 项目功能

- 商品搜索、分类筛选和排序
- 使用 limit 与 skip 参数分页
- loading、错误和空结果状态
- 商品详情弹窗
- localStorage 收藏
- 响应式布局

## 接口地址示例

全部商品：

    https://dummyjson.com/products?limit=12&skip=0&sortBy=title&order=asc

搜索：

    https://dummyjson.com/products/search?q=phone&limit=12&skip=0

分类：

    https://dummyjson.com/products/category/smartphones?limit=12&skip=0

分类列表：

    https://dummyjson.com/products/category-list

接口文档：https://dummyjson.com/docs/products

## 动手练习

按顺序完成，不必一开始就把每项都做完：

1. 修改每页数量，观察 URL 中 limit 和 skip 的变化。
2. 增加“只看低库存”筛选。
3. 增加收藏夹视图。
4. 给搜索增加 300 毫秒防抖，思考为什么不应每输入一个字符都立即请求。
5. 加入 AbortController，取消已经过时的请求。
6. 再用 Vue3 把卡片、筛选器和分页拆成组件。

## 简历标准

当前版本适合作为练习。准备写进简历前，建议先部署、补全 README，并亲自完成至少两个练习任务。你还需要能解释：一次请求从哪里发起、参数如何生成、接口返回什么、错误如何处理、页面如何更新。

完成 Vue3 + TypeScript 版本后，可以按实际完成情况描述为：

> 商品探索器：使用 Vue3、TypeScript 和 DummyJSON API 实现商品搜索、分类筛选、排序、分页、详情查看和本地收藏；处理请求加载、错误和空结果状态，并完成响应式布局与部署。
