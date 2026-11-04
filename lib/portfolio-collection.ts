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
  // Homepage order: 1 is first. null/absent = not featured.
  featured?: number | null;
  // Hidden in the admin: kept here and in Cloudinary, left off every page of the site. Absent = shown.
  hidden?: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
};