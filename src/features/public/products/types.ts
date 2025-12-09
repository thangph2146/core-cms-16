export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  sku: string
  price: string
  compareAtPrice: string | null
  stock: number
  status: string
  featured: boolean
  images?: Array<{
    id: string
    url: string
    alt: string | null
    order: number
    isPrimary: boolean
  }>
  categories?: Array<{
    id: string
    name: string
    slug: string
  }>
}

export interface ProductVariant {
  id: string
  name: string
  value: string | null
  type: string
  price: string | null
  sku: string | null
  stock: number | null
  imageUrl: string | null
  order: number
  isDefault: boolean
}

export interface ShippingInfo {
  freeShipping?: boolean
  estimatedDays?: number
  methods?: string[]
}

export interface BranchAvailability {
  branches?: Array<{
    name: string
    address: string
    hasStock: boolean
  }>
}

export interface PaymentPromotion {
  methods?: Array<{
    name: string
    discount: number
    description: string
  }>
}

export interface ProductDetail extends Product {
  images: Array<{
    id: string
    url: string
    alt: string | null
    order: number
    isPrimary: boolean
  }>
  categories: Array<{
    id: string
    name: string
    slug: string
  }>
  variants?: ProductVariant[]
  shippingInfo?: ShippingInfo | null
  promotionBanner?: string | null
  branchAvailability?: BranchAvailability | null
  paymentPromotion?: PaymentPromotion | null
  relatedProductIds?: string[]
}

