import { ObjectId } from "mongodb";

export const PORTFOLIO_COLLECTION = "portfolio_items";

export type PortfolioItemDoc = {
  _id?: ObjectId | string;
  src: string;
  title: string;
  category: string;
  year: string;
  date?: string | null;
  note?: string | null;
  artType?: string | null;
  reviewType?: string | null;
  cloudinaryPublicId?: string | null;
  width?: number;
  height?: number;
  gallery?: any[];
  coverIndex?: number;
  createdAt?: Date;
  updatedAt?: Date;
};