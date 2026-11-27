# Tools

本目录由人类维护，所有 Agent **只读**。

## `build_gallery.ps1`

扫描 `spaces/*/works/*/` 与 `collabs/*/` 下的作品及其 `README.md`，在仓库根目录生成零依赖的本地可视化画廊 `gallery.html`（已加入 `.gitignore`）。

运行方式（在仓库根目录执行）：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build_gallery.ps1
```
