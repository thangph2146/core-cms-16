"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  User,
  MessageSquare,
  FileText,
  Send,
  Loader2,
  Phone,
} from "lucide-react";

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface ContactFormProps {
  onSubmit?: (data: ContactFormData) => Promise<void>;
  className?: string;
  apiUrl?: string;
}

export function ContactForm({ onSubmit, className, apiUrl = "/api/contact" }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = "Họ tên là bắt buộc";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Họ tên phải có ít nhất 2 ký tự";
    } else if (trimmedName.length > 100) {
      newErrors.name = "Họ tên không vượt quá 100 ký tự";
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email là bắt buộc";
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = "Email không hợp lệ";
    } else if (trimmedEmail.length > 255) {
      newErrors.email = "Email không vượt quá 255 ký tự";
    }

    const trimmedSubject = formData.subject.trim();
    if (!trimmedSubject) {
      newErrors.subject = "Tiêu đề là bắt buộc";
    } else if (trimmedSubject.length < 3) {
      newErrors.subject = "Tiêu đề phải có ít nhất 3 ký tự";
    } else if (trimmedSubject.length > 200) {
      newErrors.subject = "Tiêu đề không vượt quá 200 ký tự";
    }

    const trimmedPhone = formData.phone?.trim();
    if (trimmedPhone) {
      if (trimmedPhone.length > 20) {
        newErrors.phone = "Số điện thoại không vượt quá 20 ký tự";
      } else if (!/^[0-9+\-\s()]+$/.test(trimmedPhone)) {
        newErrors.phone = "Số điện thoại chỉ được chứa số, dấu +, -, khoảng trắng và dấu ngoặc";
      }
    }

    const trimmedMessage = formData.message.trim();
    if (!trimmedMessage) {
      newErrors.message = "Nội dung tin nhắn là bắt buộc";
    } else if (trimmedMessage.length < 10) {
      newErrors.message = "Nội dung tin nhắn phải có ít nhất 10 ký tự";
    } else if (trimmedMessage.length > 5000) {
      newErrors.message = "Nội dung tin nhắn không vượt quá 5000 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default behavior - call API
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            subject: formData.subject,
            content: formData.message,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Không thể gửi tin nhắn");
        }
      }

      toast({
        variant: "success",
        title: "Gửi thành công!",
        description:
          "Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi sớm nhất có thể.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Không thể gửi tin nhắn. Vui lòng thử lại sau.";
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl lg:text-3xl font-bold text-card-foreground mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          Liên hệ với chúng tôi
        </CardTitle>
        <CardDescription className="text-lg text-muted-foreground leading-relaxed">
          Gửi tin nhắn cho chúng tôi về bất kỳ vấn đề nào cần được giải quyết.
          Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="name" className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-primary" />
                Họ tên *
              </FieldLabel>
              <FieldContent>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nhập họ tên của bạn"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  aria-invalid={Boolean(errors.name)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email" className="flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-primary" />
                Email *
              </FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập địa chỉ email của bạn"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  aria-invalid={Boolean(errors.email)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <FieldError>{errors.email}</FieldError>}
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="phone" className="flex items-center gap-2 text-foreground">
                <Phone className="h-4 w-4 text-primary" />
                Số điện thoại
              </FieldLabel>
              <FieldContent>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Nhập số điện thoại (không bắt buộc)"
                  value={formData.phone}
                  onChange={handleInputChange}
                  aria-invalid={Boolean(errors.phone)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <FieldError>{errors.phone}</FieldError>}
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors.subject)}>
              <FieldLabel htmlFor="subject" className="flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Tiêu đề *
              </FieldLabel>
              <FieldContent>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="Nhập tiêu đề tin nhắn"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  aria-invalid={Boolean(errors.subject)}
                  className={errors.subject ? "border-destructive" : ""}
                />
                {errors.subject && <FieldError>{errors.subject}</FieldError>}
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors.message)}>
              <FieldLabel htmlFor="message" className="flex items-center gap-2 text-foreground">
                <MessageSquare className="h-4 w-4 text-primary" />
                Nội dung tin nhắn *
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Mô tả chi tiết vấn đề cần được giải quyết..."
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={6}
                  required
                  aria-invalid={Boolean(errors.message)}
                  className={errors.message ? "border-destructive" : ""}
                />
                {errors.message && <FieldError>{errors.message}</FieldError>}
              </FieldContent>
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Gửi tin nhắn
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
