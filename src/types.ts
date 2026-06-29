export interface Order {
  id: string;
  name: string;
  photoSize: string;
  amountPaid: number;
  phoneNumber: string;
  description: string;
  photoBase64: string; // Base64 encoded image
  timestamp: string;
  synced: boolean;
  driveUrl?: string;
  error?: string;
}

export interface AppSettings {
  appsScriptUrl: string;
  studioName: string;
  whatsappMessageTemplate: string;
}

export const PHOTO_SIZES = [
  { value: "2x3", label: "Pas Foto 2x3 cm", defaultPrice: 10000 },
  { value: "3x4", label: "Pas Foto 3x4 cm", defaultPrice: 15000 },
  { value: "4x6", label: "Pas Foto 4x6 cm", defaultPrice: 15000 },
  { value: "2R", label: "Ukuran 2R (6x9 cm)", defaultPrice: 10000 },
  { value: "3R", label: "Ukuran 3R (8.9x12.7 cm)", defaultPrice: 15000 },
  { value: "4R", label: "Ukuran 4R (10.2x15.2 cm)", defaultPrice: 20000 },
  { value: "10R", label: "Ukuran 10R (25.4x30.5 cm)", defaultPrice: 50000 },
  { value: "Custom", label: "Ukuran Kustom", defaultPrice: 0 }
];
