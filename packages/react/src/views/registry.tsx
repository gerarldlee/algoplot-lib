import type { StructData } from '@algoplot/core';
import type { ArrayData } from '@algoplot/core';
import type { BookData } from '@algoplot/core';
import type { DeckData } from '@algoplot/core';
import type { DistData } from '@algoplot/core';
import type { FlowData } from '@algoplot/core';
import type { GanttData } from '@algoplot/core';
import type { GraphData } from '@algoplot/core';
import type { GridData } from '@algoplot/core';
import type { ListData } from '@algoplot/core';
import type { MatrixData } from '@algoplot/core';
import type { NetData } from '@algoplot/core';
import type { OctreeData } from '@algoplot/core';
import type { PlotData } from '@algoplot/core';
import type { SeqData } from '@algoplot/core';
import type { StringData } from '@algoplot/core';
import type { TreeData } from '@algoplot/core';
import type { TrieData } from '@algoplot/core';
import type { UFData } from '@algoplot/core';
import { ArrayView } from './ArrayView';
import { BookView } from './BookView';
import { DeckView } from './DeckView';
import { DistributionView } from './DistributionView';
import { FlowView } from './FlowView';
import { ForestView } from './ForestView';
import { GanttView } from './GanttView';
import { GraphView } from './GraphView';
import { GridView } from './GridView';
import { ListView } from './ListView';
import { MatrixView } from './MatrixView';
import { NetView } from './NetView';
import { OctreeView } from './OctreeView';
import { PlotView } from './PlotView';
import { SequenceView } from './SequenceView';
import { StringView } from './StringView';
import { TreeView } from './TreeView';
import { TrieView } from './TrieView';

export function StructView({ data }: { data: StructData }) {
  switch (data.type) {
    case 'array':
      return <ArrayView data={data as unknown as ArrayData} />;
    case 'list':
      return <ListView data={data as unknown as ListData} />;
    case 'graph':
      return <GraphView data={data as unknown as GraphData} />;
    case 'tree':
      return <TreeView data={data as unknown as TreeData} />;
    case 'trie':
      return <TrieView data={data as unknown as TrieData} />;
    case 'grid':
      return <GridView data={data as unknown as GridData} />;
    case 'str':
      return <StringView data={data as unknown as StringData} />;
    case 'matrix':
      return <MatrixView data={data as unknown as MatrixData} />;
    case 'dist':
      return <DistributionView data={data as unknown as DistData} />;
    case 'uf':
      return <ForestView data={data as unknown as UFData} />;
    case 'sequence':
      return <SequenceView data={data as unknown as SeqData} />;
    case 'plot':
      return <PlotView data={data as unknown as PlotData} />;
    case 'net':
      return <NetView data={data as unknown as NetData} />;
    case 'octree':
      return <OctreeView data={data as unknown as OctreeData} />;
    case 'gantt':
      return <GanttView data={data as unknown as GanttData} />;
    case 'book':
      return <BookView data={data as unknown as BookData} />;
    case 'deck':
      return <DeckView data={data as unknown as DeckData} />;
    case 'flow':
      return <FlowView data={data as unknown as FlowData} />;
    default:
      return <div className="unknown-view">unknown structure: {data.type}</div>;
  }
}
