import { useCallback, useMemo } from 'react';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import {
	createEditor,
	Editor,
	Transforms,
	Range,
	Element as SlateElement,
	Text,
} from 'slate';
import escapeHtml from 'escape-html';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';
import {
	FontBoldIcon,
	FontItalicIcon,
	UnderlineIcon,
	Pencil1Icon,
	Pencil2Icon,
} from '@radix-ui/react-icons';

const HOTKEYS = {
	'mod+b': 'bold',
	'mod+i': 'italic',
	'mod+u': 'underline',
};

const icons = {
	bold: FontBoldIcon,
	italic: FontItalicIcon,
	underline: UnderlineIcon,
};

const initialValue: Descendant[] = [
	{
		type: 'paragraph',
		children: [{ text: '' }],
	},
];

const SlateRubyTagSample = () => {
	const renderElement = useCallback((props) => <Element {...props} />, []);
	const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
	const editor = useMemo(() => withHistory(withReact(createEditor())), []);

	// Searialize--------------------------------
	const RubyHtml = (node, children) => {
		return `<ruby>
        ${node.kanji}
            <rt>${node.kana}</rt>
        </ruby>`;

		// return `<ruby>
		// ${children}
		//     <rt>${node.kana}</rt>
		// </ruby>`;
	};

	function removePByRuby(inputString) {
		const resultString = inputString
			.replace(/<ruby><p>/g, '<ruby>')
			.replace(/<\/p><rt>/g, '</rt>');
		return resultString;
	}

	function removePForRubyChildren(inputString) {
		const resultString = inputString.replace(/<p>/g, '').replace(/<\/p>/g, '');
		return resultString;
	}

	const serialize = (node) => {
		if (Text.isText(node)) {
			let string = escapeHtml(node.text);

			if (node.bold) {
				string = `<strong>${string}</strong>`;
			}
			if (node.italic) {
				string = `<em>${string}</em>`;
			}
			if (node.underline) {
				string = `<u>${string}</u>`;
			}
			return string;
		}

		// TO avoid <p> tag for ruby children
		if (node.type === 'ruby') {
			return RubyHtml(node);
		}

		const children = node.children.map((n) => serialize(n)).join('');

		switch (node.type) {
			// If To remove <p> tag for ruby children after tagging bold, italic and underline works, then we can comment in the below case
			// case "ruby":
			//     return RubyHtml(node, children);
			default:
				return `<p>${children}</p>`;
		}
	};

	const click = () => {
		const serialized = serialize(editor);
		console.log(serialized);
		const result = removePByRuby(serialized);
		console.log(result);
	};
	// Serialize  end

	return (
		<>
			<button onClick={click}>Serialize test for ruby tag</button>
			<div className='border-2'>
				<Slate editor={editor} initialValue={initialValue}>
					<div>
						<MarkButton format='bold' />
						<MarkButton format='italic' />
						<MarkButton format='underline' />
						<AddRubyButton />
						<RemoveRubyButton />
					</div>
					<Editable
						renderElement={renderElement}
						renderLeaf={renderLeaf}
						placeholder='Enter your question text...'
						spellCheck
						autoFocus
						onKeyDown={(event) => {
							for (const hotkey in HOTKEYS) {
								if (isHotkey(hotkey, event as any)) {
									event.preventDefault();
									const mark = HOTKEYS[hotkey];
									toggleMark(editor, mark);
								}
							}
						}}
					/>
				</Slate>
			</div>
		</>
	);
};

// Bold, Italic, Underline
const isMarkActive = (editor, format) => {
	const marks = Editor.marks(editor);
	return marks ? marks[format] === true : false;
};

const toggleMark = (editor, format) => {
	const isActive = isMarkActive(editor, format);

	if (isActive) {
		Editor.removeMark(editor, format);
	} else {
		Editor.addMark(editor, format, true);
	}
};

const Leaf = ({ attributes, children, leaf }) => {
	if (leaf.bold) {
		children = <strong>{children}</strong>;
	}

	if (leaf.italic) {
		children = <em>{children}</em>;
	}

	if (leaf.underline) {
		children = <u>{children}</u>;
	}

	return <span {...attributes}>{children}</span>;
};

const MarkButton = ({ format }) => {
	const editor = useSlate();
	const Icon = icons[format];

	return (
		<button
			active={isMarkActive(editor, format)}
			onMouseDown={(event) => {
				event.preventDefault();
				toggleMark(editor, format);
			}}
		>
			<Icon />
		</button>
	);
};

// Bold, Italic, Underline end

// Ruby
const RubyComponent = ({ attributes, children, element }) => {
	return (
		<ruby {...attributes}>
			{children}
			<rt>{element.kana}</rt>
		</ruby>
	);
};

const Element = (props) => {
	const { attributes, children, element } = props;
	const style = { textAlign: element.align };

	switch (element.type) {
		case 'ruby':
			return <RubyComponent {...props} />;
		default:
			return (
				<span style={style} {...attributes}>
					{children}
				</span>
			);
	}
};

const isRubyActive = (editor) => {
	const [ruby] = Editor.nodes(editor, {
		match: (n) =>
			!Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'ruby',
	});
	return !!ruby;
};

const unwrapRuby = (editor) => {
	Transforms.unwrapNodes(editor, {
		match: (n) =>
			!Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'ruby',
	});
};

const wrapRuby = (editor, kanji: string, kana: string) => {
	if (isRubyActive(editor)) {
		unwrapRuby(editor);
	}

	const { selection } = editor;
	const isCollapsed = selection && Range.isCollapsed(selection);
	const ruby: RubyElement = {
		type: 'ruby',
		kanji,
		kana,
		children: isCollapsed ? [{ text: kana }] : [],
	};

	if (isCollapsed) {
		Transforms.insertNodes(editor, ruby);
	} else {
		Transforms.wrapNodes(editor, ruby, { split: true });
		Transforms.collapse(editor, { edge: 'end' });
	}
};

const insertRuby = (editor, kanji, kana) => {
	if (editor.selection) {
		wrapRuby(editor, kanji, kana);
	}
};

const AddRubyButton = () => {
	const editor = useSlate();
	return (
		<button
			onMouseDown={(event) => {
				event.preventDefault();
				const kana = window.prompt('Enter the kana of the kanji:');
				if (!kana) return;

				const selection = editor.selection;
				const path = selection?.anchor.path[0];
				const start = selection?.anchor.offset;
				const end = selection?.focus.offset;
				const lineText = editor.children[path].children[0].text;
				const kanji = lineText.substring(start, end);

				insertRuby(editor, kanji, kana);
			}}
		>
			<Pencil1Icon />
		</button>
	);
};

const RemoveRubyButton = () => {
	const editor = useSlate();

	return (
		<button
			onMouseDown={(event) => {
				if (isRubyActive(editor)) {
					unwrapRuby(editor);
				}
			}}
		>
			<Pencil2Icon />
		</button>
	);
};
// Ruby end

export default SlateRubyTagSample;
