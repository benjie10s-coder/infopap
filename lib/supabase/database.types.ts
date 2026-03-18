// lib/supabase/database.types.ts — Supabase Database type definition
// Generated from SQL migrations to give the Supabase client proper types
// Tables: User, Invoice, LineItem, InvoicePhoto, Payment, DeliveryNote, DeliveryNoteLineItem, DeliveryNotePhoto, DeliveryNotePayment, Receipt, ReceiptPhoto, ReceiptPayment, CashSale, CashSaleLineItem, CashSalePhoto, CashSalePayment, Quotation, QuotationLineItem, QuotationPhoto, QuotationPayment, PurchaseOrder, PurchaseOrderLineItem, PurchaseOrderPhoto, PurchaseOrderPayment, Subscription, AuditLog

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatarUrl: string | null;
          externalId: string | null;
          provider: string | null;
          businessName: string | null;
          businessEmail: string | null;
          businessPhone: string | null;
          businessAddress: string | null;
          businessCity: string | null;
          businessZipCode: string | null;
          businessNumber: string | null;
          defaultCurrency: string;
          defaultTaxRate: number;
          logoUrl: string | null;
          signatureUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatarUrl?: string | null;
          externalId?: string | null;
          provider?: string | null;
          businessName?: string | null;
          businessEmail?: string | null;
          businessPhone?: string | null;
          businessAddress?: string | null;
          businessCity?: string | null;
          businessZipCode?: string | null;
          businessNumber?: string | null;
          defaultCurrency?: string;
          defaultTaxRate?: number;
          logoUrl?: string | null;
          signatureUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatarUrl?: string | null;
          externalId?: string | null;
          provider?: string | null;
          businessName?: string | null;
          businessEmail?: string | null;
          businessPhone?: string | null;
          businessAddress?: string | null;
          businessCity?: string | null;
          businessZipCode?: string | null;
          businessNumber?: string | null;
          defaultCurrency?: string;
          defaultTaxRate?: number;
          logoUrl?: string | null;
          signatureUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      Invoice: {
        Row: {
          id: string;
          userId: string | null;
          guestSessionId: string | null;
          publicId: string;
          documentType: string;
          documentTitle: string;
          invoiceNumber: string;
          issueDate: string;
          dueDate: string | null;
          paymentTerms: string;
          fromName: string;
          fromEmail: string | null;
          fromPhone: string | null;
          fromMobile: string | null;
          fromFax: string | null;
          fromAddress: string | null;
          fromCity: string | null;
          fromZipCode: string | null;
          fromBusinessNumber: string | null;
          toName: string;
          toEmail: string | null;
          toPhone: string | null;
          toMobile: string | null;
          toFax: string | null;
          toAddress: string | null;
          toCity: string | null;
          toZipCode: string | null;
          toBusinessNumber: string | null;
          currency: string;
          taxRate: number;
          discountType: string;
          discountValue: number;
          subtotal: number;
          taxAmount: number;
          discountAmount: number;
          total: number;
          accentColor: string;
          logoDataUrl: string | null;
          signatureDataUrl: string | null;
          notes: string | null;
          isPaid: boolean;
          paidAt: string | null;
          pdfUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId: string;
          documentType?: string;
          documentTitle?: string;
          invoiceNumber: string;
          issueDate?: string;
          dueDate?: string | null;
          paymentTerms?: string;
          fromName: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          taxRate?: number;
          discountType?: string;
          discountValue?: number;
          subtotal?: number;
          taxAmount?: number;
          discountAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId?: string;
          documentType?: string;
          documentTitle?: string;
          invoiceNumber?: string;
          issueDate?: string;
          dueDate?: string | null;
          paymentTerms?: string;
          fromName?: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName?: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          taxRate?: number;
          discountType?: string;
          discountValue?: number;
          subtotal?: number;
          taxAmount?: number;
          discountAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Invoice_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      LineItem: {
        Row: {
          id: string;
          invoiceId: string;
          description: string;
          additionalDetails: string | null;
          quantity: number;
          rate: number;
          amount: number;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          invoiceId: string;
          description: string;
          additionalDetails?: string | null;
          quantity: number;
          rate: number;
          amount: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          invoiceId?: string;
          description?: string;
          additionalDetails?: string | null;
          quantity?: number;
          rate?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "LineItem_invoiceId_fkey";
            columns: ["invoiceId"];
            isOneToOne: false;
            referencedRelation: "Invoice";
            referencedColumns: ["id"];
          },
        ];
      };
      InvoicePhoto: {
        Row: {
          id: string;
          invoiceId: string;
          url: string;
          filename: string | null;
          sortOrder: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          invoiceId: string;
          url: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          invoiceId?: string;
          url?: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "InvoicePhoto_invoiceId_fkey";
            columns: ["invoiceId"];
            isOneToOne: false;
            referencedRelation: "Invoice";
            referencedColumns: ["id"];
          },
        ];
      };
      Payment: {
        Row: {
          id: string;
          invoiceId: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          transactionDate: string | null;
          status: string;
          resultCode: string | null;
          resultDesc: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          invoiceId: string;
          userId?: string | null;
          phoneNumber: string;
          amount: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          invoiceId?: string;
          userId?: string | null;
          phoneNumber?: string;
          amount?: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Payment_invoiceId_fkey";
            columns: ["invoiceId"];
            isOneToOne: false;
            referencedRelation: "Invoice";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Payment_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Delivery Note tables ──────────────────────────
      DeliveryNote: {
        Row: {
          id: string;
          userId: string | null;
          guestSessionId: string | null;
          publicId: string;
          documentTitle: string;
          deliveryNoteNumber: string;
          issueDate: string;
          orderNumber: string | null;
          referenceInvoiceNumber: string | null;
          acknowledgmentText: string;
          fromName: string;
          fromEmail: string | null;
          fromPhone: string | null;
          fromMobile: string | null;
          fromFax: string | null;
          fromAddress: string | null;
          fromCity: string | null;
          fromZipCode: string | null;
          fromBusinessNumber: string | null;
          toName: string;
          toEmail: string | null;
          toPhone: string | null;
          toMobile: string | null;
          toFax: string | null;
          toAddress: string | null;
          toCity: string | null;
          toZipCode: string | null;
          toBusinessNumber: string | null;
          accentColor: string;
          logoDataUrl: string | null;
          signatureDataUrl: string | null;
          notes: string | null;
          isPaid: boolean;
          paidAt: string | null;
          pdfUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId: string;
          documentTitle?: string;
          deliveryNoteNumber: string;
          issueDate?: string;
          orderNumber?: string | null;
          referenceInvoiceNumber?: string | null;
          acknowledgmentText?: string;
          fromName: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId?: string;
          documentTitle?: string;
          deliveryNoteNumber?: string;
          issueDate?: string;
          orderNumber?: string | null;
          referenceInvoiceNumber?: string | null;
          acknowledgmentText?: string;
          fromName?: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName?: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "DeliveryNote_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      DeliveryNoteLineItem: {
        Row: {
          id: string;
          deliveryNoteId: string;
          description: string;
          additionalDetails: string | null;
          quantity: number;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          deliveryNoteId: string;
          description: string;
          additionalDetails?: string | null;
          quantity: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          deliveryNoteId?: string;
          description?: string;
          additionalDetails?: string | null;
          quantity?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "DeliveryNoteLineItem_deliveryNoteId_fkey";
            columns: ["deliveryNoteId"];
            isOneToOne: false;
            referencedRelation: "DeliveryNote";
            referencedColumns: ["id"];
          },
        ];
      };
      DeliveryNotePhoto: {
        Row: {
          id: string;
          deliveryNoteId: string;
          url: string;
          filename: string | null;
          sortOrder: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          deliveryNoteId: string;
          url: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          deliveryNoteId?: string;
          url?: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "DeliveryNotePhoto_deliveryNoteId_fkey";
            columns: ["deliveryNoteId"];
            isOneToOne: false;
            referencedRelation: "DeliveryNote";
            referencedColumns: ["id"];
          },
        ];
      };
      DeliveryNotePayment: {
        Row: {
          id: string;
          deliveryNoteId: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          transactionDate: string | null;
          status: string;
          resultCode: string | null;
          resultDesc: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          deliveryNoteId: string;
          userId?: string | null;
          phoneNumber: string;
          amount: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          deliveryNoteId?: string;
          userId?: string | null;
          phoneNumber?: string;
          amount?: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "DeliveryNotePayment_deliveryNoteId_fkey";
            columns: ["deliveryNoteId"];
            isOneToOne: false;
            referencedRelation: "DeliveryNote";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "DeliveryNotePayment_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      Receipt: {
        Row: {
          id: string;
          publicId: string;
          userId: string | null;
          guestSessionId: string | null;
          documentTitle: string;
          receiptNumber: string;
          issueDate: string;
          fromName: string;
          fromEmail: string | null;
          fromPhone: string | null;
          fromMobile: string | null;
          fromFax: string | null;
          fromAddress: string | null;
          fromCity: string | null;
          fromZipCode: string | null;
          fromBusinessNumber: string | null;
          toName: string;
          toEmail: string | null;
          toPhone: string | null;
          toMobile: string | null;
          toFax: string | null;
          toAddress: string | null;
          toCity: string | null;
          toZipCode: string | null;
          toBusinessNumber: string | null;
          currency: string;
          totalAmountOwed: number;
          amountReceived: number;
          outstandingBalance: number;
          amountInWords: string | null;
          beingPaymentOf: string | null;
          paymentMethod: string;
          transactionCode: string | null;
          notes: string | null;
          accentColor: string;
          logoDataUrl: string | null;
          signatureDataUrl: string | null;
          pdfUrl: string | null;
          isPaid: boolean;
          paidAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          publicId: string;
          userId?: string | null;
          guestSessionId?: string | null;
          documentTitle?: string;
          receiptNumber: string;
          issueDate?: string;
          fromName: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          totalAmountOwed?: number;
          amountReceived?: number;
          outstandingBalance?: number;
          amountInWords?: string | null;
          beingPaymentOf?: string | null;
          paymentMethod?: string;
          transactionCode?: string | null;
          notes?: string | null;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          pdfUrl?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          publicId?: string;
          userId?: string | null;
          guestSessionId?: string | null;
          documentTitle?: string;
          receiptNumber?: string;
          issueDate?: string;
          fromName?: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName?: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          totalAmountOwed?: number;
          amountReceived?: number;
          outstandingBalance?: number;
          amountInWords?: string | null;
          beingPaymentOf?: string | null;
          paymentMethod?: string;
          transactionCode?: string | null;
          notes?: string | null;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          pdfUrl?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Receipt_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      ReceiptPhoto: {
        Row: {
          id: string;
          receiptId: string;
          url: string;
          filename: string | null;
          sortOrder: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          receiptId: string;
          url: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          receiptId?: string;
          url?: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ReceiptPhoto_receiptId_fkey";
            columns: ["receiptId"];
            isOneToOne: false;
            referencedRelation: "Receipt";
            referencedColumns: ["id"];
          },
        ];
      };
      ReceiptPayment: {
        Row: {
          id: string;
          receiptId: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          transactionDate: string | null;
          status: string;
          resultCode: string | null;
          resultDesc: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          receiptId: string;
          userId?: string | null;
          phoneNumber: string;
          amount: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          receiptId?: string;
          userId?: string | null;
          phoneNumber?: string;
          amount?: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ReceiptPayment_receiptId_fkey";
            columns: ["receiptId"];
            isOneToOne: false;
            referencedRelation: "Receipt";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ReceiptPayment_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Cash Sale tables ──────────────────────────────────────────────
      CashSale: {
        Row: {
          id: string;
          userId: string | null;
          guestSessionId: string | null;
          publicId: string;
          documentTitle: string;
          cashSaleNumber: string;
          issueDate: string;
          orderNumber: string | null;
          referenceInvoiceNumber: string | null;
          paymentMethod: string;
          transactionCode: string | null;
          fromName: string;
          fromEmail: string | null;
          fromPhone: string | null;
          fromMobile: string | null;
          fromFax: string | null;
          fromAddress: string | null;
          fromCity: string | null;
          fromZipCode: string | null;
          fromBusinessNumber: string | null;
          toName: string;
          toEmail: string | null;
          toPhone: string | null;
          toMobile: string | null;
          toFax: string | null;
          toAddress: string | null;
          toCity: string | null;
          toZipCode: string | null;
          toBusinessNumber: string | null;
          currency: string;
          taxRate: number;
          discountType: string;
          discountValue: number;
          subtotal: number;
          taxAmount: number;
          discountAmount: number;
          total: number;
          accentColor: string;
          logoDataUrl: string | null;
          signatureDataUrl: string | null;
          notes: string | null;
          isPaid: boolean;
          paidAt: string | null;
          pdfUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId: string;
          documentTitle?: string;
          cashSaleNumber: string;
          issueDate?: string;
          orderNumber?: string | null;
          referenceInvoiceNumber?: string | null;
          paymentMethod?: string;
          transactionCode?: string | null;
          fromName: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          taxRate?: number;
          discountType?: string;
          discountValue?: number;
          subtotal?: number;
          taxAmount?: number;
          discountAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId?: string;
          documentTitle?: string;
          cashSaleNumber?: string;
          issueDate?: string;
          orderNumber?: string | null;
          referenceInvoiceNumber?: string | null;
          paymentMethod?: string;
          transactionCode?: string | null;
          fromName?: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName?: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          taxRate?: number;
          discountType?: string;
          discountValue?: number;
          subtotal?: number;
          taxAmount?: number;
          discountAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "CashSale_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      CashSaleLineItem: {
        Row: {
          id: string;
          cashSaleId: string;
          description: string;
          additionalDetails: string | null;
          quantity: number;
          rate: number;
          amount: number;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          cashSaleId: string;
          description: string;
          additionalDetails?: string | null;
          quantity: number;
          rate?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          cashSaleId?: string;
          description?: string;
          additionalDetails?: string | null;
          quantity?: number;
          rate?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "CashSaleLineItem_cashSaleId_fkey";
            columns: ["cashSaleId"];
            isOneToOne: false;
            referencedRelation: "CashSale";
            referencedColumns: ["id"];
          },
        ];
      };
      CashSalePhoto: {
        Row: {
          id: string;
          cashSaleId: string;
          url: string;
          filename: string | null;
          sortOrder: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          cashSaleId: string;
          url: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          cashSaleId?: string;
          url?: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "CashSalePhoto_cashSaleId_fkey";
            columns: ["cashSaleId"];
            isOneToOne: false;
            referencedRelation: "CashSale";
            referencedColumns: ["id"];
          },
        ];
      };
      CashSalePayment: {
        Row: {
          id: string;
          cashSaleId: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          transactionDate: string | null;
          status: string;
          resultCode: string | null;
          resultDesc: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          cashSaleId: string;
          userId?: string | null;
          phoneNumber: string;
          amount: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          cashSaleId?: string;
          userId?: string | null;
          phoneNumber?: string;
          amount?: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "CashSalePayment_cashSaleId_fkey";
            columns: ["cashSaleId"];
            isOneToOne: false;
            referencedRelation: "CashSale";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "CashSalePayment_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      Quotation: {
        Row: {
          id: string;
          userId: string | null;
          guestSessionId: string | null;
          publicId: string;
          documentTitle: string;
          quotationNumber: string;
          quotationDate: string;
          validUntil: string | null;
          fromName: string;
          fromEmail: string | null;
          fromPhone: string | null;
          fromMobile: string | null;
          fromFax: string | null;
          fromAddress: string | null;
          fromCity: string | null;
          fromZipCode: string | null;
          fromBusinessNumber: string | null;
          toName: string;
          toEmail: string | null;
          toPhone: string | null;
          toMobile: string | null;
          toFax: string | null;
          toAddress: string | null;
          toCity: string | null;
          toZipCode: string | null;
          toBusinessNumber: string | null;
          currency: string;
          discountType: string;
          discountValue: number;
          subtotal: number;
          discountAmount: number;
          total: number;
          accentColor: string;
          logoDataUrl: string | null;
          signatureDataUrl: string | null;
          termsAndConditions: string | null;
          notes: string | null;
          isPaid: boolean;
          paidAt: string | null;
          pdfUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId: string;
          documentTitle?: string;
          quotationNumber: string;
          quotationDate?: string;
          validUntil?: string | null;
          fromName: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          discountType?: string;
          discountValue?: number;
          subtotal?: number;
          discountAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          termsAndConditions?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId?: string;
          documentTitle?: string;
          quotationNumber?: string;
          quotationDate?: string;
          validUntil?: string | null;
          fromName?: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          toName?: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          currency?: string;
          discountType?: string;
          discountValue?: number;
          subtotal?: number;
          discountAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          termsAndConditions?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Quotation_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      QuotationLineItem: {
        Row: {
          id: string;
          quotationId: string;
          description: string;
          additionalDetails: string | null;
          quantity: number;
          rate: number;
          amount: number;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          quotationId: string;
          description: string;
          additionalDetails?: string | null;
          quantity: number;
          rate?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          quotationId?: string;
          description?: string;
          additionalDetails?: string | null;
          quantity?: number;
          rate?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "QuotationLineItem_quotationId_fkey";
            columns: ["quotationId"];
            isOneToOne: false;
            referencedRelation: "Quotation";
            referencedColumns: ["id"];
          },
        ];
      };
      QuotationPhoto: {
        Row: {
          id: string;
          quotationId: string;
          url: string;
          filename: string | null;
          sortOrder: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          quotationId: string;
          url: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          quotationId?: string;
          url?: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "QuotationPhoto_quotationId_fkey";
            columns: ["quotationId"];
            isOneToOne: false;
            referencedRelation: "Quotation";
            referencedColumns: ["id"];
          },
        ];
      };
      QuotationPayment: {
        Row: {
          id: string;
          quotationId: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          transactionDate: string | null;
          status: string;
          resultCode: string | null;
          resultDesc: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          quotationId: string;
          userId?: string | null;
          phoneNumber: string;
          amount: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          quotationId?: string;
          userId?: string | null;
          phoneNumber?: string;
          amount?: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "QuotationPayment_quotationId_fkey";
            columns: ["quotationId"];
            isOneToOne: false;
            referencedRelation: "Quotation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "QuotationPayment_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      PurchaseOrder: {
        Row: {
          id: string;
          userId: string | null;
          guestSessionId: string | null;
          publicId: string;
          documentTitle: string;
          purchaseOrderNumber: string;
          issueDate: string;
          expectedDeliveryDate: string | null;
          paymentTerms: string | null;
          orderNumber: string | null;
          fromName: string;
          fromEmail: string | null;
          fromPhone: string | null;
          fromMobile: string | null;
          fromFax: string | null;
          fromAddress: string | null;
          fromCity: string | null;
          fromZipCode: string | null;
          fromBusinessNumber: string | null;
          fromWebsite: string | null;
          toName: string;
          toEmail: string | null;
          toPhone: string | null;
          toMobile: string | null;
          toFax: string | null;
          toAddress: string | null;
          toCity: string | null;
          toZipCode: string | null;
          toBusinessNumber: string | null;
          shipToEnabled: boolean;
          shipToName: string | null;
          shipToCompanyName: string | null;
          shipToAddress: string | null;
          shipToCity: string | null;
          shipToZipCode: string | null;
          shipToPhone: string | null;
          authorizedByName: string | null;
          authorizedByDesignation: string | null;
          currency: string;
          taxRate: number;
          subtotal: number;
          taxAmount: number;
          total: number;
          accentColor: string;
          logoDataUrl: string | null;
          signatureDataUrl: string | null;
          notes: string | null;
          isPaid: boolean;
          paidAt: string | null;
          pdfUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId: string;
          documentTitle?: string;
          purchaseOrderNumber: string;
          issueDate?: string;
          expectedDeliveryDate?: string | null;
          paymentTerms?: string | null;
          orderNumber?: string | null;
          fromName: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          fromWebsite?: string | null;
          toName: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          shipToEnabled?: boolean;
          shipToName?: string | null;
          shipToCompanyName?: string | null;
          shipToAddress?: string | null;
          shipToCity?: string | null;
          shipToZipCode?: string | null;
          shipToPhone?: string | null;
          authorizedByName?: string | null;
          authorizedByDesignation?: string | null;
          currency?: string;
          taxRate?: number;
          subtotal?: number;
          taxAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          guestSessionId?: string | null;
          publicId?: string;
          documentTitle?: string;
          purchaseOrderNumber?: string;
          issueDate?: string;
          expectedDeliveryDate?: string | null;
          paymentTerms?: string | null;
          orderNumber?: string | null;
          fromName?: string;
          fromEmail?: string | null;
          fromPhone?: string | null;
          fromMobile?: string | null;
          fromFax?: string | null;
          fromAddress?: string | null;
          fromCity?: string | null;
          fromZipCode?: string | null;
          fromBusinessNumber?: string | null;
          fromWebsite?: string | null;
          toName?: string;
          toEmail?: string | null;
          toPhone?: string | null;
          toMobile?: string | null;
          toFax?: string | null;
          toAddress?: string | null;
          toCity?: string | null;
          toZipCode?: string | null;
          toBusinessNumber?: string | null;
          shipToEnabled?: boolean;
          shipToName?: string | null;
          shipToCompanyName?: string | null;
          shipToAddress?: string | null;
          shipToCity?: string | null;
          shipToZipCode?: string | null;
          shipToPhone?: string | null;
          authorizedByName?: string | null;
          authorizedByDesignation?: string | null;
          currency?: string;
          taxRate?: number;
          subtotal?: number;
          taxAmount?: number;
          total?: number;
          accentColor?: string;
          logoDataUrl?: string | null;
          signatureDataUrl?: string | null;
          notes?: string | null;
          isPaid?: boolean;
          paidAt?: string | null;
          pdfUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "PurchaseOrder_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      PurchaseOrderLineItem: {
        Row: {
          id: string;
          purchaseOrderId: string;
          description: string;
          additionalDetails: string | null;
          quantity: number;
          unitPrice: number;
          amount: number;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          purchaseOrderId: string;
          description: string;
          additionalDetails?: string | null;
          quantity: number;
          unitPrice?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          purchaseOrderId?: string;
          description?: string;
          additionalDetails?: string | null;
          quantity?: number;
          unitPrice?: number;
          amount?: number;
          sortOrder?: number;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "PurchaseOrderLineItem_purchaseOrderId_fkey";
            columns: ["purchaseOrderId"];
            isOneToOne: false;
            referencedRelation: "PurchaseOrder";
            referencedColumns: ["id"];
          },
        ];
      };
      PurchaseOrderPhoto: {
        Row: {
          id: string;
          purchaseOrderId: string;
          url: string;
          filename: string | null;
          sortOrder: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          purchaseOrderId: string;
          url: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          purchaseOrderId?: string;
          url?: string;
          filename?: string | null;
          sortOrder?: number;
          createdAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "PurchaseOrderPhoto_purchaseOrderId_fkey";
            columns: ["purchaseOrderId"];
            isOneToOne: false;
            referencedRelation: "PurchaseOrder";
            referencedColumns: ["id"];
          },
        ];
      };
      PurchaseOrderPayment: {
        Row: {
          id: string;
          purchaseOrderId: string;
          userId: string | null;
          phoneNumber: string;
          amount: number;
          currency: string;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          transactionDate: string | null;
          status: string;
          resultCode: string | null;
          resultDesc: string | null;
          createdAt: string;
          updatedAt: string;
          completedAt: string | null;
        };
        Insert: {
          id: string;
          purchaseOrderId: string;
          userId?: string | null;
          phoneNumber: string;
          amount: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Update: {
          id?: string;
          purchaseOrderId?: string;
          userId?: string | null;
          phoneNumber?: string;
          amount?: number;
          currency?: string;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          transactionDate?: string | null;
          status?: string;
          resultCode?: string | null;
          resultDesc?: string | null;
          createdAt?: string;
          updatedAt?: string;
          completedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "PurchaseOrderPayment_purchaseOrderId_fkey";
            columns: ["purchaseOrderId"];
            isOneToOne: false;
            referencedRelation: "PurchaseOrder";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "PurchaseOrderPayment_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      AuditLog: {
        Row: {
          id: string;
          actor: string;
          action: string;
          targetType: string | null;
          targetId: string | null;
          details: Record<string, unknown>;
          ipAddress: string | null;
          createdAt: string;
        };
        Insert: {
          id?: string;
          actor?: string;
          action: string;
          targetType?: string | null;
          targetId?: string | null;
          details?: Record<string, unknown>;
          ipAddress?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          actor?: string;
          action?: string;
          targetType?: string | null;
          targetId?: string | null;
          details?: Record<string, unknown>;
          ipAddress?: string | null;
          createdAt?: string;
        };
        Relationships: [];
      };
      Subscription: {
        Row: {
          id: string;
          userId: string;
          plan: string;
          status: string;
          documentsLimit: number;
          documentsUsed: number;
          amountPaid: number;
          phoneNumber: string;
          purchasedAt: string | null;
          expiresAt: string | null;
          renewedFromId: string | null;
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          mpesaReceiptNumber: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          userId: string;
          plan: string;
          status?: string;
          documentsLimit: number;
          documentsUsed?: number;
          amountPaid: number;
          phoneNumber: string;
          purchasedAt?: string | null;
          expiresAt?: string | null;
          renewedFromId?: string | null;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          plan?: string;
          status?: string;
          documentsLimit?: number;
          documentsUsed?: number;
          amountPaid?: number;
          phoneNumber?: string;
          purchasedAt?: string | null;
          expiresAt?: string | null;
          renewedFromId?: string | null;
          merchantRequestId?: string | null;
          checkoutRequestId?: string | null;
          mpesaReceiptNumber?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Subscription_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Subscription_renewedFromId_fkey";
            columns: ["renewedFromId"];
            isOneToOne: false;
            referencedRelation: "Subscription";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_dashboard_stats: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_platform_stats: {
        Args: { p_admin_secret: string };
        Returns: Json;
      };
      create_payment_if_unpaid: {
        Args: {
          p_payment_id: string;
          p_invoice_id: string;
          p_user_id: string | null;
          p_phone_number: string;
          p_amount: number;
        };
        Returns: Json;
      };
      create_delivery_note_payment_if_unpaid: {
        Args: {
          p_payment_id: string;
          p_delivery_note_id: string;
          p_user_id: string | null;
          p_phone_number: string;
          p_amount: number;
        };
        Returns: Json;
      };
      create_receipt_payment_if_unpaid: {
        Args: {
          p_payment_id: string;
          p_receipt_id: string;
          p_user_id: string | null;
          p_phone_number: string;
          p_amount: number;
        };
        Returns: Json;
      };
      create_cash_sale_payment_if_unpaid: {
        Args: {
          p_payment_id: string;
          p_cash_sale_id: string;
          p_user_id: string | null;
          p_phone_number: string;
          p_amount: number;
        };
        Returns: Json;
      };
      create_quotation_payment_if_unpaid: {
        Args: {
          p_payment_id: string;
          p_quotation_id: string;
          p_user_id: string | null;
          p_phone_number: string;
          p_amount: number;
        };
        Returns: Json;
      };
      create_purchase_order_payment_if_unpaid: {
        Args: {
          p_payment_id: string;
          p_purchase_order_id: string;
          p_user_id: string | null;
          p_phone_number: string;
          p_amount: number;
        };
        Returns: Json;
      };
      use_subscription_document: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      activate_subscription: {
        Args: {
          p_checkout_request_id: string;
          p_receipt: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
