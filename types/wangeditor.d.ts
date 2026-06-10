// 模块声明 shim：解决 @wangeditor/editor-for-vue 的 package.json
// 没有在 exports 中暴露 types 条件,导致 TS 在 Bundler 解析模式下找不到类型。
// 实际类型文件存在于 dist/src/index.d.ts,这里用宽松的 DefineComponent 兼容。

declare module '@wangeditor/editor-for-vue' {
  import type { DefineComponent } from 'vue'

  export const Editor: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export const Toolbar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
}

declare module '@wangeditor/editor/dist/css/style.css' {
  const content: string
  export default content
}
