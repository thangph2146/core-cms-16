import { SignIn } from "@/components/forms"
import { PublicHeader } from "@/components/headers"

export default function SignInPage() {
  return (
    <>
      <PublicHeader />
      <div className="bg-muted flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          <SignIn />
        </div>
      </div>
    </>
  )
}

