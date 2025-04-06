/**
 * Type definitions for Sharp image processing library
 * Used with platform-specific implementations from @img/* packages
 */

declare module 'sharp' {
  namespace sharp {
    interface Metadata {
      width?: number;
      height?: number;
      format?: string;
      size?: number;
    }
    
    interface SharpInstance {
      metadata(): Promise<Metadata>;
      resize(width?: number, height?: number, options?: {
        fit?: 'inside' | 'outside' | 'cover' | 'contain' | 'fill';
        withoutEnlargement?: boolean;
      }): SharpInstance;
      jpeg(options?: { quality?: number }): SharpInstance;
      toBuffer(): Promise<Buffer>;
    }
  }

  function sharp(input: Buffer | string): sharp.SharpInstance;
  
  export = sharp;
  export default sharp;
}
