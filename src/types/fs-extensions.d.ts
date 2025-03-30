// Type extensions for Node.js fs module
import 'fs';

declare module 'fs' {
  interface ObjectEncodingOptions {
    flush?: boolean;
  }
}
