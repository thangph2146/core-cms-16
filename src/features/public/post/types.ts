/**
 * Types for public post feature
 */

export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  image: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    name: string | null
    email: string
  }
  categories: Array<{
    id: string
    name: string
    slug: string
  }>
  tags: Array<{
    id: string
    name: string
    slug: string
  }>
}

export interface PostDetail extends Post {
  content: unknown
}

