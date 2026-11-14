/**
 * Colour marker before a word. Teal and orange are too light for small text
 * on cream, so the word stays charcoal and the colour goes on the dot. Inline
 * rather than a flex item, so the text keeps its baseline.
 */
export function Dot(props: { class: string }) {
  return (
    <span
      class={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${props.class}`}
      aria-hidden="true"
    />
  );
}
