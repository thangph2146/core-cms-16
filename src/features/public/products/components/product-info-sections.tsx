"use client"

import { memo } from "react"
import { Tag, Truck, MapPin, CreditCard } from "lucide-react"
import type { ProductDetail } from "../types"

interface ProductInfoSectionsProps {
  product: ProductDetail
}

const PromotionBanner = memo<{ banner: string }>(({ banner }) => (
  <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
    <div className="flex items-start gap-2">
      <Tag className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-medium text-primary mb-1">Ưu đãi đặc biệt</div>
        <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: banner }} />
      </div>
    </div>
  </div>
))
PromotionBanner.displayName = "PromotionBanner"

const ShippingInfo = memo<{ shippingInfo: NonNullable<ProductDetail["shippingInfo"]> }>(
  ({ shippingInfo }) => (
    <div className="rounded-lg bg-muted/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Thông tin vận chuyển</span>
      </div>
      {shippingInfo.freeShipping && (
        <p className="text-sm text-green-600">✓ Miễn phí vận chuyển</p>
      )}
      {shippingInfo.estimatedDays && (
        <p className="text-sm text-muted-foreground">
          Giao hàng dự kiến: {shippingInfo.estimatedDays} ngày
        </p>
      )}
      {shippingInfo.methods && shippingInfo.methods.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Phương thức: {shippingInfo.methods.join(", ")}
        </div>
      )}
    </div>
  )
)
ShippingInfo.displayName = "ShippingInfo"

const BranchAvailability = memo<{
  branches: Array<{ name: string; address: string; hasStock: boolean }>
}>(({ branches }) => (
  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Chi nhánh có hàng</span>
    </div>
    <div className="space-y-1">
      {branches.map((branch, idx) => (
        <div key={idx} className="flex items-center justify-between text-sm">
          <span className={branch.hasStock ? "text-green-600" : "text-muted-foreground"}>
            {branch.name}
          </span>
          <span className={branch.hasStock ? "text-green-600 font-medium" : "text-muted-foreground"}>
            {branch.hasStock ? "✓ Có hàng" : "Hết hàng"}
          </span>
        </div>
      ))}
    </div>
  </div>
))
BranchAvailability.displayName = "BranchAvailability"

const PaymentPromotion = memo<{
  methods: Array<{ name: string; discount: number; description: string }>
}>(({ methods }) => (
  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
    <div className="flex items-center gap-2">
      <CreditCard className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Ưu đãi thanh toán</span>
    </div>
    <div className="space-y-2">
      {methods.map((method, idx) => (
        <div key={idx} className="text-sm">
          <div className="font-medium">{method.name}</div>
          {method.discount > 0 && (
            <div className="text-green-600">Giảm {method.discount}%</div>
          )}
          {method.description && (
            <div className="text-muted-foreground text-xs">{method.description}</div>
          )}
        </div>
      ))}
    </div>
  </div>
))
PaymentPromotion.displayName = "PaymentPromotion"

export const ProductInfoSections = memo<ProductInfoSectionsProps>(({ product }) => {
  return (
    <>
      {product.promotionBanner && <PromotionBanner banner={product.promotionBanner} />}
      {product.shippingInfo && <ShippingInfo shippingInfo={product.shippingInfo} />}
      {product.branchAvailability?.branches && product.branchAvailability.branches.length > 0 && (
        <BranchAvailability branches={product.branchAvailability.branches} />
      )}
      {product.paymentPromotion?.methods && product.paymentPromotion.methods.length > 0 && (
        <PaymentPromotion methods={product.paymentPromotion.methods} />
      )}
    </>
  )
})
ProductInfoSections.displayName = "ProductInfoSections"


