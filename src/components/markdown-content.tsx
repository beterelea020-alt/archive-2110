import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function MarkdownContent({content}:{content:string}){return <div className="markdown-content" dir="rtl"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>}
