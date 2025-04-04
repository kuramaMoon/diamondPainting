// state.ts
import * as PIXI from 'pixi.js';

export interface Cell {
  x: number;
  y: number;
  square: PIXI.Graphics;
  text?: PIXI.Text;
  isBackground: boolean;
  fillColor: number;
}

export interface ColorInfo {
  number: string; // Changed from number to string
  pictureNumber: string;
  rgb: [number, number, number];
}

// State management
let cells: Cell[][] = [];
let globalPixels: Uint8ClampedArray = new Uint8ClampedArray();
let colorMap: { [key: string]: ColorInfo } = {};
let selectedCells: Set<string> = new Set();
let lassoToolActive: boolean = false;

export function getCells(): Cell[][] {
  return cells;
}

export function setCells(newCells: Cell[][]): void {
  cells = newCells;
}

export function getGlobalPixels(): Uint8ClampedArray {
  return globalPixels;
}

export function setGlobalPixels(pixels: Uint8ClampedArray): void {
  globalPixels = pixels;
}

export function getColorMap(): { [key: string]: ColorInfo } {
  return colorMap;
}

export function setColorMap(newColorMap: { [key: string]: ColorInfo }): void {
  colorMap = newColorMap;
}

export function getSelectedCells(): Set<string> {
  return selectedCells;
}

export function setSelectedCells(newSelectedCells: Set<string>): void {
  selectedCells = newSelectedCells;
}

export function getLassoToolActive(): boolean {
  return lassoToolActive;
}

export function setLassoToolActive(active: boolean): void {
  lassoToolActive = active;
}