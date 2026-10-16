"use client";

import React, { Fragment, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

type ModalSize = NonNullable<ModalProps["size"]>;

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[90vw]",
};

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      size = "md",
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
    },
    ref
  ) => {
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && closeOnEscape) {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
      }
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const modalContent = (
      <Fragment>
        <div
          className="fixed inset-0 bg-black/60 z-[999] animate-in"
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
        <div
          ref={ref}
          className={`
            fixed inset-0 z-[1000] flex items-center justify-center p-4
            animate-in
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
        >
          <div
            className={`
              w-full ${sizeStyles[size]} bg-surface border border-border rounded-xl
              shadow-xl overflow-hidden
              max-h-[90vh] flex flex-col
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 p-4 border-b border-border">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 id="modal-title" className="text-heading-md text-foreground">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="modal-description" className="text-body-sm text-muted-foreground mt-1">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </div>
        </div>
      </Fragment>
    );

    if (typeof window === "undefined") return null;

    return createPortal(modalContent, document.body);
  }
);

Modal.displayName = "Modal";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "success";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const variantMap = {
    danger: "danger" as const,
    primary: "primary" as const,
    success: "success" as const,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-body-md text-muted-foreground mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variantMap[variant]} onClick={handleConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}