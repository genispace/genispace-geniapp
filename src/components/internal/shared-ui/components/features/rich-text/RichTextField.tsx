import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@genispace/shared-utils';

export interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

/**
 * Tiptap-based rich text (P2). Stores HTML; use for long description/narration fields.
 * Requires peer deps: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-underline, @tiptap/extension-placeholder.
 */
export function RichTextField({
  value,
  onChange,
  placeholder = '',
  disabled,
  className,
  minHeight = '120px',
}: RichTextFieldProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p></p>',
    editable: !disabled,
    onUpdate: ({ editor: ed }: { editor: { getHTML: () => string } }) => {
      onChange(ed.getHTML());
    },
  });

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={{ minHeight }}
    >
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 [&_.ProseMirror]:min-h-[6rem] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
