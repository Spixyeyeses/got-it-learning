# 课程包起始模板

1. 复制 `package.template.json` 和 `lesson-shard.template.json` 到新的 `data/curriculum/packages/<package-id>/` 目录。
2. 替换所有 `replace` / `REPLACE` 占位值，并在课程地图确定后编写内容。
3. 编写期间保持目录项 `enabled: false`，审核阶段从 `draft` 依次推进。
4. 运行 `node tools/build-curriculum-bundle.mjs`，让构建器生成分片哈希和题目数量。
5. 运行 `node tools/build-curriculum-bundle.mjs --check` 和全部测试。
6. 只有课程、课次和题目均达到 `releasable` 后，才把目录项改为 `enabled: true`。

模板属于制作参考，不会被网页、PWA 或 Android 运行时装载。
