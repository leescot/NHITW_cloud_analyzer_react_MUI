/**
 * Markdown 渲染器組件
 *
 * 使用 react-markdown 和 remark-gfm 支援完整的 markdown 語法
 * 包括：列表、表格、粗體、斜體、連結等
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Link,
  Box
} from '@mui/material';

const MarkdownRenderer = ({ content, variant = 'body2' }) => {
  // Preprocess content to fix markdown formatting issues
  const processedContent = content
    ? content
      .replace(/\s+$/gm, '')                              // Remove trailing spaces at end of each line
      .replace(/\n{3,}/g, '\n\n')                         // Compress 3+ consecutive newlines to 2
      .replace(/^(\s*[-*+]\s+.+)\n+(?=\s*[-*+])/gm, '$1\n')  // Remove extra blank lines between list items
      .replace(/(^\s*\|.*)\n\s*\n(?=\s*\|)/gm, '$1\n')    // Remove blank lines inside tables
      .replace(/^([^|\n\s].*)\n(\s*\|)/gm, '$1\n\n$2')    // Ensure blank line before table
      .replace(/^(\s*\|.*)\n([^|\n\s].*)/gm, '$1\n\n$2')  // Ensure blank line after table
    : '';

  // Custom components to use MUI styling
  const components = {
    // Table components
    table: ({ node, ...props }) => (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          my: 2,
          maxWidth: '100%',
          overflowX: 'auto'
        }}
      >
        <Table size="small" sx={{ minWidth: 'auto' }} {...props} />
      </TableContainer>
    ),
    thead: ({ node, ...props }) => <TableHead {...props} />,
    tbody: ({ node, ...props }) => <TableBody {...props} />,
    tr: ({ node, ...props }) => <TableRow {...props} />,
    th: ({ node, ...props }) => (
      <TableCell
        {...props}
        sx={{
          fontWeight: 'bold',
          bgcolor: 'grey.100',
          borderBottom: 2,
          borderColor: 'grey.300'
        }}
      />
    ),
    td: ({ node, ...props }) => <TableCell {...props} />,

    // Typography components
    p: ({ node, ...props }) => (
      <Typography
        variant={variant}
        sx={{ m: 0, lineHeight: 1.1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        {...props}
      />
    ),
    h1: ({ node, ...props }) => <Typography variant="h5" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5 }} {...props} />,
    h2: ({ node, ...props }) => <Typography variant="h6" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5 }} {...props} />,
    h3: ({ node, ...props }) => <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1, mb: 0.3 }} {...props} />,
    h4: ({ node, ...props }) => <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1, mb: 0.3 }} {...props} />,

    // List components
    ul: ({ node, ...props }) => (
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          pl: 2.5,
          listStylePosition: 'outside',
          '& ul': { mt: 0, mb: 0, pt: 0 },
          '& > li': { mb: 0 }
        }}
        {...props}
      />
    ),
    ol: ({ node, ...props }) => (
      <Box
        component="ol"
        sx={{
          m: 0,
          p: 0,
          pl: 2.5,
          listStylePosition: 'outside',
          '& ol': { mt: 0, mb: 0, pt: 0 },
          '& > li': { mb: 0 }
        }}
        {...props}
      />
    ),
    li: ({ node, ...props }) => (
      <Box
        component="li"
        sx={{
          mb: 0,
          mt: 0,
          lineHeight: 1.1,
          '& > p': { m: 0, display: 'inline', lineHeight: 1.1 },
          '& > ul, & > ol': { mt: 0, mb: 0 }
        }}
      >
        <Typography
          variant={variant}
          component="span"
          sx={{
            lineHeight: 1.1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: 'inline'
          }}
          {...props}
        />
      </Box>
    ),

    // Link component
    a: ({ node, ...props }) => (
      <Link {...props} target="_blank" rel="noopener noreferrer" />
    ),

    // Code components
    code: ({ node, inline, ...props }) => (
      inline ? (
        <Typography
          component="code"
          sx={{
            bgcolor: 'grey.100',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }}
          {...props}
        />
      ) : (
        <Box
          component="pre"
          sx={{
            bgcolor: 'grey.100',
            p: 1.5,
            borderRadius: 1,
            overflow: 'auto',
            my: 1
          }}
        >
          <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }} {...props} />
        </Box>
      )
    ),

    // Blockquote
    blockquote: ({ node, ...props }) => (
      <Box
        component="blockquote"
        sx={{
          borderLeft: '4px solid',
          borderColor: 'grey.300',
          pl: 2,
          py: 0.5,
          my: 1,
          ml: 0,
          color: 'text.secondary',
          fontStyle: 'italic'
        }}
        {...props}
      />
    ),

    // Strong (bold)
    strong: ({ node, ...props }) => (
      <Typography component="strong" fontWeight="bold" {...props} />
    ),

    // Em (italic)
    em: ({ node, ...props }) => (
      <Typography component="em" fontStyle="italic" {...props} />
    )
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
