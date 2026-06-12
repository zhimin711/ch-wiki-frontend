/**
 * 设置 dayjs 全局 locale 为中文,保证 el-date-picker / el-time-picker /
 * 任何使用 dayjs 的 Element Plus 组件在 SSR/CSR 下都显示中文。
 * ElConfigProvider 也会触发 dayjs 切换,但显式声明更稳。
 */
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

export default defineNuxtPlugin(() => {
  dayjs.locale('zh-cn')
})
