const fs = require('fs');
const path = require('path');

function processFile(filename, isInvoice) {
  const f = path.join(process.env.HOME, 'Code/website-ban-hang-dieptra/pos-hisweetie', filename);
  let code = fs.readFileSync(f, 'utf8');

  const label = isInvoice ? 'Ghi chú hóa đơn' : 'Ghi chú đơn hàng';
  const labelIdx = code.indexOf(label);
  
  if (labelIdx === -1) {
    console.log('Could not find label:', label);
    return;
  }

  // Find the parent <div> that contains the label+textarea
  // Go backward from label to find the opening <div>
  const beforeLabel = code.substring(0, labelIdx);
  const divStart = beforeLabel.lastIndexOf('<div>');
  
  // Find NoteTemplateModal after this section
  const noteModalIdx = code.indexOf('<NoteTemplateModal', divStart);
  if (noteModalIdx === -1) {
    console.log('Could not find NoteTemplateModal');
    return;
  }

  // Extract the section to replace (from <div> to before NoteTemplateModal)
  const sectionToRemove = code.substring(divStart, noteModalIdx);
  console.log('Removing section from offset', divStart, 'to', noteModalIdx);
  console.log('Section length:', sectionToRemove.length);

  // Replacement: just the note textarea div (no totals/discount card)
  const replacement = `<div>
<label className="block text-sm lg:text-sm text-gray-600 mb-0.5 lg:mb-1">
${label}
</label>
<textarea
value={orderNote}
onChange={(e) => onOrderNoteChange(e.target.value.slice(0, 1000))}
maxLength={1000}
placeholder="Nhập ghi chú..."
className="w-full border rounded-xl px-3 py-1.5 lg:py-2 text-sm lg:text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
rows={2}
/>
</div>`;

  code = code.substring(0, divStart) + replacement + code.substring(noteModalIdx);
  fs.writeFileSync(f, code, 'utf8');
  console.log(filename + ' updated. New size:', code.length, 'chars');
}

processFile('components/pos/OrderItemsList.tsx', false);
processFile('components/pos/InvoiceItemsList.tsx', true);
