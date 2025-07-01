// src/lib/utils.ts

/*
 * This file contains utility functions for the project
 * cn() is used to merge class names
*/


import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
