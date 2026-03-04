export interface FinanceRecord {
  productName: string;
  price: number;
  seller: string;
  salesPerson: string;
  time: string;
}

export interface LoginResponse {
  token: string;
  saltB64: string;
}

export interface EncryptedRecord {
  id: string | number;
  ciphertextB64: string;
  ivB64: string;
  createdAt?: string;
}

export type DecryptedRecord = FinanceRecord & { id: string };
