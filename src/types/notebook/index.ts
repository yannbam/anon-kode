/**
 * Notebook type definitions
 * These types define the structure of Jupyter notebook files
 */

export interface Notebook {
  cells: NotebookCell[];
  metadata: NotebookMetadata;
  nbformat: number;
  nbformat_minor: number;
}

export interface NotebookMetadata {
  kernelspec?: {
    display_name: string;
    language: string;
    name: string;
  };
  language_info?: {
    codemirror_mode?: any;
    file_extension?: string;
    mimetype?: string;
    name: string;
    pygments_lexer?: string;
    version?: string;
  };
  [key: string]: any;
}

export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  metadata: {
    [key: string]: any;
  };
  execution_count?: number | null;
  outputs?: CellOutput[];
}

export type CellOutput = 
  | StreamOutput
  | DisplayDataOutput
  | ExecuteResultOutput
  | ErrorOutput;

export interface StreamOutput {
  output_type: 'stream';
  name: 'stdout' | 'stderr';
  text: string | string[];
}

export interface DisplayDataOutput {
  output_type: 'display_data';
  data: {
    [key: string]: any;
  };
  metadata: {
    [key: string]: any;
  };
}

export interface ExecuteResultOutput {
  output_type: 'execute_result';
  execution_count: number;
  data: {
    [key: string]: any;
  };
  metadata: {
    [key: string]: any;
  };
}

export interface ErrorOutput {
  output_type: 'error';
  ename: string;
  evalue: string;
  traceback: string[];
}

// Export notebook.js-compatible types
export interface NotebookModel {
  cells: NotebookCell[];
  metadata: NotebookMetadata;
}

// Adding types used in NotebookEditTool and NotebookReadTool
export type NotebookCellType = 'code' | 'markdown' | 'raw';

export interface NotebookContent {
  cells: NotebookCell[];
  metadata: NotebookMetadata;
  nbformat: number;
  nbformat_minor: number;
}

export interface NotebookOutputImage {
  image_data: string;
  media_type: string;
}

export interface NotebookCellSourceOutput {
  output_type: string;
  text?: string;
  image?: NotebookOutputImage;
}

export interface NotebookCellOutput {
  output_type: 'stream' | 'display_data' | 'execute_result' | 'error';
  text?: string | string[];
  data?: {
    [key: string]: any;
  };
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface NotebookCellSource {
  cell: number;
  cellType: NotebookCellType;
  source: string;
  language: string;
  execution_count?: number | null;
  outputs?: NotebookCellSourceOutput[];
}
