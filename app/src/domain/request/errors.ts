/**
 * 依頼文を生成できないこと。未定義の組み合わせは、代替文を出さず、生成を明示的に失敗させる（request-blocks.md §1）
 */
export class GenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GenerationError'
  }
}
