export interface MetadataItem {
  id: string;
  filename: string;
  originalPrompt: string;
  title: string;
  keywords: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export interface CsvRow {
  Filename: string;
  Title: string;
  Keywords: string;
  Category: string;
}

export enum AppState {
  INPUT = 'INPUT',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
}

export const ADOBE_CATEGORIES = [
  "Animals",
  "Buildings and Architecture",
  "Business",
  "Drinks",
  "Environment",
  "States of Mind",
  "Food",
  "Graphic Resources",
  "Hobbies and Leisure",
  "Industry",
  "Landscapes",
  "Lifestyle",
  "People",
  "Plants and Flowers",
  "Culture and Religion",
  "Science",
  "Social Issues",
  "Sports",
  "Technology",
  "Transport",
  "Travel"
];