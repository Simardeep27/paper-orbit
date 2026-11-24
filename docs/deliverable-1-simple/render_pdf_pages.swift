import Foundation
import PDFKit
import AppKit
let url = URL(fileURLWithPath: "DELIVERABLE_1.pdf")
guard let doc = PDFDocument(url: url) else { fatalError("open failed") }
print("pages=\(doc.pageCount)")
let scale: CGFloat = 1.5
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let b = page.bounds(for: .mediaBox)
    let size = NSSize(width: b.width * scale, height: b.height * scale)
    let image = NSImage(size: size)
    image.lockFocus()
    NSColor.white.setFill(); NSRect(origin: .zero, size: size).fill()
    let ctx = NSGraphicsContext.current!.cgContext
    ctx.saveGState(); ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    ctx.restoreGState(); image.unlockFocus()
    guard let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else { continue }
    try png.write(to: URL(fileURLWithPath: String(format: "pdf-page-%d.png", i + 1)))
}
