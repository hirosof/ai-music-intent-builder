// 保存データの複製。保存データは JSON（DP-07）なので、JSON を通して複製する。
// structuredClone は Vue のリアクティブなオブジェクト（Proxy）を複製できない（U4a で判明）。
// JSON を通す複製は Proxy を経由して読むため、computed の中で使っても依存が追える
export const cloneJson = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
