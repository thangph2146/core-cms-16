"use client";

import {
  Bell,
  User,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle as XCircleIcon,
} from "lucide-react";
import {
  ResourceDetailClient,
  FieldItem,
  type ResourceDetailField,
  type ResourceDetailSection,
} from "@/features/admin/resources/components";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { formatDateVi } from "@/features/admin/users/utils";
import { cn } from "@/lib/utils";
import {
  useResourceDetailData,
  useResourceDetailLogger,
} from "@/features/admin/resources/hooks";
import { useMarkNotificationRead } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { NOTIFICATION_KINDS } from "../constants";

export interface NotificationDetailData extends Record<string, unknown> {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  kind: string;
  title: string;
  description: string | null;
  isRead: boolean;
  actionUrl: string | null;
  metadata: unknown;
  expiresAt: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationDetailClientProps {
  notificationId: string;
  notification: NotificationDetailData;
  backUrl?: string;
}

export function NotificationDetailClient({
  notificationId,
  notification,
  backUrl = "/admin/notifications",
}: NotificationDetailClientProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const detailQueryKey = useMemo(
    () => ["notifications", "admin", "detail", notificationId] as const,
    [notificationId]
  );
  
  const {
    data: detailData,
    isFetched,
    isFromApi,
    fetchedData,
  } = useResourceDetailData({
    initialData: notification,
    resourceId: notificationId,
    detailQueryKey: (id: string) =>
      ["notifications", "admin", "detail", id] as const,
    resourceName: "notifications",
    fetchOnMount: false, // Tắt fetch vì route không có GET method
  });

  useResourceDetailLogger({
    resourceName: "notifications",
    resourceId: notificationId,
    data: detailData,
    isFetched,
    isFromApi,
    fetchedData,
  });

  const markNotificationRead = useMarkNotificationRead();
  const isOwner = session?.user?.id === detailData.userId;
  const isToggling = markNotificationRead.isPending;

  const handleToggleRead = useCallback(async (checked: boolean) => {
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Không có quyền",
        description: "Bạn chỉ có thể thay đổi trạng thái thông báo của chính mình.",
      });
      return;
    }

    try {
      const updatedNotification = await markNotificationRead.mutateAsync({
        id: notificationId,
        isRead: checked,
      });
      
      // Cập nhật cache cho detail query
      // updatedNotification từ mutation đã được parse dates, cần convert về string format
      queryClient.setQueryData<{ data: NotificationDetailData }>(
        detailQueryKey,
        (oldData) => {
          if (!oldData) {
            return { data: detailData };
          }
          
          const readAtValue = updatedNotification.readAt
            ? updatedNotification.readAt instanceof Date
              ? updatedNotification.readAt.toISOString()
              : typeof updatedNotification.readAt === "string"
              ? updatedNotification.readAt
              : null
            : null;
          
          return {
            data: {
              ...oldData.data,
              isRead: updatedNotification.isRead,
              readAt: readAtValue,
            },
          };
        }
      );
      
      toast({
        variant: "success",
        title: "Thành công",
        description: checked
          ? "Thông báo đã được đánh dấu là đã đọc."
          : "Thông báo đã được đánh dấu là chưa đọc.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật trạng thái thông báo.",
      });
    }
  }, [notificationId, detailData, detailQueryKey, queryClient, markNotificationRead, isOwner, toast]);

  const detailFields: ResourceDetailField<NotificationDetailData>[] = [];

  const detailSections: ResourceDetailSection<NotificationDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính của thông báo",
      fieldsContent: (_fields, data) => {
        const notificationData = (data || detailData) as NotificationDetailData;
        const kindConfigData = NOTIFICATION_KINDS[notificationData.kind] || {
          label: notificationData.kind,
          variant: "secondary" as const,
        };

        return (
          <div className="space-y-6">
            {/* Kind & Title */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <FieldItem icon={Bell} label="Loại thông báo">
                <Badge variant={kindConfigData.variant} className="text-xs">
                  {kindConfigData.label}
                </Badge>
              </FieldItem>

              <FieldItem icon={FileText} label="Tiêu đề">
                <div className="text-sm font-medium text-foreground">
                  {notificationData.title || "—"}
                </div>
              </FieldItem>
            </div>

            {/* Description */}
            {notificationData.description && (
              <Card className="border border-border/50 bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Mô tả
                    </h3>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                      {notificationData.description || "—"}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* User */}
            <FieldItem icon={User} label="Người dùng">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">
                  {notificationData.user?.email || "—"}
                </div>
                {notificationData.user?.name && (
                  <div className="text-xs text-muted-foreground">
                    {notificationData.user.name}
                  </div>
                )}
              </div>
            </FieldItem>
          </div>
        );
      },
    },
    {
      id: "status",
      title: "Trạng thái",
      description: "Thông tin trạng thái của thông báo",
      fieldsContent: (_fields, data) => {
        const notificationData = data as NotificationDetailData;
        const isNotificationOwner = session?.user?.id === notificationData.userId;

        return (
          <div className="space-y-6">
            {/* Read Status & Read Date - 2 columns on sm+ */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              {/* Read Status */}
              <FieldItem
                icon={notificationData.isRead ? CheckCircle : XCircleIcon}
                label="Trạng thái đọc"
                iconColor={
                  notificationData.isRead
                    ? "bg-green-500/10 hover:bg-green-500/20"
                    : "bg-amber-500/10 hover:bg-amber-500/20"
                }
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={notificationData.isRead}
                    disabled={isToggling || !isNotificationOwner}
                    onCheckedChange={handleToggleRead}
                    aria-label={
                      notificationData.isRead
                        ? "Đánh dấu chưa đọc"
                        : "Đánh dấu đã đọc"
                    }
                  />
                  
                </div>
                {!isNotificationOwner && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Chỉ có thể thay đổi trạng thái thông báo của chính mình
                  </p>
                )}
              </FieldItem>

              {/* Read Date */}
              {notificationData.readAt && (
                <FieldItem icon={Clock} label="Ngày đọc">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <time
                      dateTime={notificationData.readAt}
                      className="text-sm font-medium text-foreground"
                      title={new Date(notificationData.readAt).toLocaleString(
                        "vi-VN",
                        {
                          dateStyle: "full",
                          timeStyle: "long",
                        }
                      )}
                    >
                      {formatDateVi(notificationData.readAt)}
                    </time>
                  </div>
                </FieldItem>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "additional",
      title: "Thông tin bổ sung",
      description: "Thông tin chi tiết về thông báo",
      fieldsContent: (_fields, data) => {
        const notificationData = data as NotificationDetailData;

        // Count fields for grid layout
        const hasActionUrl = !!notificationData.actionUrl;
        const hasExpiresAt = !!notificationData.expiresAt;
        const fieldCount = (hasActionUrl ? 1 : 0) + 1 + (hasExpiresAt ? 1 : 0); // actionUrl + createdAt + expiresAt

        return (
          <div className="space-y-6">
            {/* Action URL & Timestamps - Grid layout */}
            <div
              className={cn(
                "grid gap-6",
                fieldCount === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
              )}
            >
              {/* Action URL */}
              {notificationData.actionUrl && (
                <FieldItem icon={ExternalLink} label="URL hành động">
                  <a
                    href={notificationData.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors w-full min-w-0"
                    title={notificationData.actionUrl}
                  >
                    <span className="truncate flex-1 min-w-0">
                      {notificationData.actionUrl}
                    </span>
                  </a>
                </FieldItem>
              )}

              {/* Created At */}
              <FieldItem icon={Calendar} label="Ngày tạo">
                {notificationData.createdAt ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <time
                      dateTime={notificationData.createdAt}
                      className="text-sm font-medium text-foreground"
                      title={new Date(
                        notificationData.createdAt
                      ).toLocaleString("vi-VN", {
                        dateStyle: "full",
                        timeStyle: "long",
                      })}
                    >
                      {formatDateVi(notificationData.createdAt)}
                    </time>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </FieldItem>

              {/* Expires At */}
              {notificationData.expiresAt && (
                <FieldItem
                  icon={
                    new Date(notificationData.expiresAt) < new Date()
                      ? AlertCircle
                      : Info
                  }
                  label="Ngày hết hạn"
                  iconColor={
                    new Date(notificationData.expiresAt) < new Date()
                      ? "bg-destructive/10"
                      : "bg-muted"
                  }
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <time
                        dateTime={notificationData.expiresAt}
                        className={cn(
                          "text-sm font-medium",
                          new Date(notificationData.expiresAt) < new Date()
                            ? "text-destructive"
                            : "text-foreground"
                        )}
                        title={new Date(
                          notificationData.expiresAt
                        ).toLocaleString("vi-VN", {
                          dateStyle: "full",
                          timeStyle: "long",
                        })}
                      >
                        {formatDateVi(notificationData.expiresAt)}
                      </time>
                    </div>
                    {new Date(notificationData.expiresAt) < new Date() && (
                      <Badge variant="destructive" className="text-xs w-fit">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Đã hết hạn
                      </Badge>
                    )}
                  </div>
                </FieldItem>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <ResourceDetailClient<NotificationDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.title}
      description={`Thông báo ${(
        NOTIFICATION_KINDS[detailData.kind] || { label: detailData.kind }
      ).label.toLowerCase()} cho ${detailData.user?.email || "người dùng"}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
    />
  );
}
