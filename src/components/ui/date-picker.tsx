"use client"

import * as React from "react"
import { useState } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  dateFormat?: string
  disabled?: boolean
  className?: string
  showTimeSlots?: boolean
  timeSlots?: Array<{ time: string; available: boolean }>
  onTimeChange?: (time: string | null) => void
  selectedTime?: string | null
  enableTime?: boolean
  showSeconds?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Chọn ngày",
  dateFormat,
  disabled = false,
  className,
  showTimeSlots = false,
  timeSlots,
  onTimeChange,
  selectedTime,
  enableTime = false,
  showSeconds = false,
}: DatePickerProps) {
  const today = React.useMemo(() => new Date(), [])
  const [internalDate, setInternalDate] = useState<Date | undefined>(date)
  const [internalTime, setInternalTime] = useState<string | null>(selectedTime ?? null)
  const [open, setOpen] = useState(false)

  // Parse time từ date nếu có
  const getTimeFromDate = (dateValue: Date | undefined) => {
    if (!dateValue) return { hour: 0, minute: 0, second: 0 }
    return {
      hour: dateValue.getHours(),
      minute: dateValue.getMinutes(),
      second: dateValue.getSeconds(),
    }
  }

  const [timeInputs, setTimeInputs] = useState(getTimeFromDate(date))

  // Sync internal state with external prop
  React.useEffect(() => {
    setInternalDate(date)
    if (date && enableTime) {
      setTimeInputs(getTimeFromDate(date))
    }
  }, [date, enableTime])

  const currentDate = date !== undefined ? date : internalDate

  const combineDateAndTime = (selectedDate: Date | undefined, hour: number, minute: number, second: number): Date | undefined => {
    if (!selectedDate) return undefined
    const combined = new Date(selectedDate)
    combined.setHours(hour, minute, second, 0)
    return combined
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    const selectedDate = newDate
    setInternalDate(selectedDate)
    
    if (enableTime) {
      const combined = combineDateAndTime(selectedDate, timeInputs.hour, timeInputs.minute, timeInputs.second)
      onDateChange(combined)
    } else {
      onDateChange(selectedDate)
    }
    
    if (showTimeSlots && onTimeChange) {
      setInternalTime(null)
      onTimeChange(null)
    }
  }

  const handleTimeInputChange = (field: "hour" | "minute" | "second", value: number) => {
    const clampedValue = field === "hour" 
      ? Math.max(0, Math.min(23, value))
      : Math.max(0, Math.min(59, value))
    
    const newTimeInputs = { ...timeInputs, [field]: clampedValue }
    setTimeInputs(newTimeInputs)
    
    if (currentDate) {
      const combined = combineDateAndTime(
        currentDate,
        newTimeInputs.hour,
        newTimeInputs.minute,
        newTimeInputs.second
      )
      if (combined) {
        onDateChange(combined)
      }
    }
  }

  const handleTimeSelect = (timeSlot: string) => {
    setInternalTime(timeSlot)
    if (onTimeChange) {
      onTimeChange(timeSlot)
    }
  }

  // Determine display format
  const getDisplayFormat = () => {
    if (dateFormat) return dateFormat
    if (enableTime) {
      return showSeconds ? "dd/MM/yyyy HH:mm:ss" : "dd/MM/yyyy HH:mm"
    }
    return "dd/MM/yyyy"
  }

  const displayFormat = getDisplayFormat()
  const displayDate = currentDate ? format(currentDate, displayFormat, { locale: vi }) : placeholder
  const hasValue = !!currentDate

  // Custom formatter để hiển thị "MM/yyyy" thay vì "Tháng Mười Một 2025"
  const formatMonthCaption = (month: Date) => {
    return format(month, "MM/yyyy")
  }

  // State để quản lý month/year được hiển thị (cho navigation)
  const [displayMonth, setDisplayMonth] = useState<Date>(() => currentDate || today)

  // Sync displayMonth với currentDate khi currentDate thay đổi
  React.useEffect(() => {
    if (currentDate) {
      // So sánh để tránh update không cần thiết
      const currentMonthYear = currentDate.getFullYear() * 12 + currentDate.getMonth()
      const displayMonthYear = displayMonth.getFullYear() * 12 + displayMonth.getMonth()
      if (currentMonthYear !== displayMonthYear) {
        setDisplayMonth(currentDate)
      }
    }
  }, [currentDate])

  // Generate years list (từ năm hiện tại - 10 đến năm hiện tại + 10)
  const currentYearValue = new Date().getFullYear()
  const years = Array.from({ length: 21 }, (_, i) => currentYearValue - 10 + i)
  
  // Month names
  const monthNames = [
    "01", "02", "03", "04", "05", "06",
    "07", "08", "09", "10", "11", "12"
  ]

  const currentYear = displayMonth.getFullYear()
  const currentMonthIndex = displayMonth.getMonth()

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value)
    const newDate = new Date(displayMonth)
    newDate.setFullYear(newYear)
    setDisplayMonth(newDate)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value)
    const newDate = new Date(displayMonth)
    newDate.setMonth(newMonth)
    setDisplayMonth(newDate)
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setDisplayMonth(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setDisplayMonth(newDate)
  }

  if (showTimeSlots && timeSlots) {
    return (
      <div className={cn("rounded-lg border border-border", className)}>
        <div className="flex flex-col">
          {/* Custom Month/Year Selector với Navigation */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handlePreviousMonth}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Button>
            <div className="flex items-center justify-center gap-2 flex-1">
              <select
                value={currentMonthIndex}
                onChange={handleMonthChange}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                aria-label="Chọn tháng"
              >
                {monthNames.map((monthName, index) => (
                  <option key={index} value={index}>
                    {monthName}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium text-muted-foreground">/</span>
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                aria-label="Chọn năm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleNextMonth}
              aria-label="Tháng sau"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </Button>
          </div>
          <div className="flex max-sm:flex-col">
            <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleDateSelect}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            className="p-2 sm:pe-5 bg-background"
            locale={vi}
            disabled={[{ before: today }]}
            formatters={{
              formatMonthCaption,
            }}
            classNames={{
              month_caption: "hidden", // Hide default caption vì chúng ta sẽ dùng custom dropdown
              nav: "hidden", // Hide default navigation buttons vì chúng ta đã thêm vào Custom Month/Year Selector
            }}
          />
          <div className="relative w-full max-sm:h-48 sm:w-40">
            <div className="absolute inset-0 border-border py-4 max-sm:border-t sm:border-s">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="text-sm font-medium">
                      {currentDate ? format(currentDate, "EEEE, d", { locale: vi }) : format(today, "EEEE, d", { locale: vi })}
                    </p>
                  </div>
                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {timeSlots.map(({ time: timeSlot, available }) => (
                      <Button
                        key={timeSlot}
                        variant={internalTime === timeSlot ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleTimeSelect(timeSlot)}
                        disabled={!available}
                      >
                        {timeSlot}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
          </div>
        </div>
      </div>
    )
  }

  // Simple date picker without time slots (for filter use)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full justify-start text-left text-xs font-normal",
            !hasValue && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {displayDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-auto p-0",
          enableTime && "min-w-[280px]"
        )} 
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col">
          {/* Custom Month/Year Selector với Navigation */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handlePreviousMonth}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Button>
            <div className="flex items-center justify-center gap-2 flex-1">
              <select
                value={currentMonthIndex}
                onChange={handleMonthChange}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                aria-label="Chọn tháng"
              >
                {monthNames.map((monthName, index) => (
                  <option key={index} value={index}>
                    {monthName}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium text-muted-foreground">/</span>
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                aria-label="Chọn năm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleNextMonth}
              aria-label="Tháng sau"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleDateSelect}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            initialFocus
            locale={vi}
            formatters={{
              formatMonthCaption,
            }}
            classNames={{
              month_caption: "hidden", // Hide default caption vì chúng ta sẽ dùng custom dropdown
              nav: "hidden", // Hide default navigation buttons vì chúng ta đã thêm vào Custom Month/Year Selector
            }}
          />
          {enableTime && (
            <div className="border-t bg-muted/30">
              <div className="px-4 py-3 space-y-2.5">
                <label className="text-xs font-medium text-foreground block">Thời gian</label>
                <div className="flex items-end gap-2 justify-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <label htmlFor="time-hour" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Giờ
                    </label>
                    <Input
                      id="time-hour"
                      type="number"
                      min={0}
                      max={23}
                      value={timeInputs.hour.toString().padStart(2, "0")}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                        handleTimeInputChange("hour", val)
                      }}
                      onBlur={(e) => {
                        const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                        handleTimeInputChange("hour", val)
                      }}
                      className="h-10 w-16 text-center text-base font-semibold"
                      placeholder="00"
                      disabled={disabled}
                    />
                  </div>
                  <span className="text-xl font-bold text-muted-foreground pb-1.5 leading-none">:</span>
                  <div className="flex flex-col items-center gap-1.5">
                    <label htmlFor="time-minute" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Phút
                    </label>
                    <Input
                      id="time-minute"
                      type="number"
                      min={0}
                      max={59}
                      value={timeInputs.minute.toString().padStart(2, "0")}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                        handleTimeInputChange("minute", val)
                      }}
                      onBlur={(e) => {
                        const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                        handleTimeInputChange("minute", val)
                      }}
                      className="h-10 w-16 text-center text-base font-semibold"
                      placeholder="00"
                      disabled={disabled}
                    />
                  </div>
                  {showSeconds && (
                    <>
                      <span className="text-xl font-bold text-muted-foreground pb-1.5 leading-none">:</span>
                      <div className="flex flex-col items-center gap-1.5">
                        <label htmlFor="time-second" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Giây
                        </label>
                        <Input
                          id="time-second"
                          type="number"
                          min={0}
                          max={59}
                          value={timeInputs.second.toString().padStart(2, "0")}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                            handleTimeInputChange("second", val)
                          }}
                          onBlur={(e) => {
                            const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                            handleTimeInputChange("second", val)
                          }}
                          className="h-10 w-16 text-center text-base font-semibold"
                          placeholder="00"
                          disabled={disabled}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {hasValue && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() => {
                  setInternalDate(undefined)
                  setTimeInputs({ hour: 0, minute: 0, second: 0 })
                  onDateChange(undefined)
                  setOpen(false)
                }}
              >
                Xóa
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
