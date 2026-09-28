// PDF generation for Financial Freedom Calculator plans
// Uses HTML2Canvas and jsPDF for client-side generation

export async function generatePlanPDF(
  planName: string,
  email: string,
  planData: Record<string, any>
) {
  try {
    // Dynamically import to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).jsPDF

    // Create a temporary container for PDF content
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.width = '800px'
    container.style.backgroundColor = '#fff'
    container.style.padding = '40px'
    container.style.fontFamily = 'Arial, sans-serif'

    // Format the plan data for display
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    container.innerHTML = `
      <div style="max-width: 100%; color: #26303B;">
        <div style="border-bottom: 3px solid #0A2540; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px 0; color: #0A2540; font-size: 32px; font-weight: 900;">
            Financial Freedom Plan
          </h1>
          <p style="margin: 0; color: #5C6570; font-size: 14px;">
            ${planName} | Generated ${dateStr}
          </p>
        </div>

        <div style="background: #F4F6F8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px 0; color: #0A2540; font-size: 16px; font-weight: 700;">
            Plan Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #DCE1E6; width: 50%;">
                <strong style="color: #5C6570; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px;">
                  Email
                </strong>
                <span style="font-size: 14px; color: #26303B;">${email}</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #DCE1E6; padding-left: 20px;">
                <strong style="color: #5C6570; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px;">
                  Date Created
                </strong>
                <span style="font-size: 14px; color: #26303B;">${dateStr}</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px 0; color: #0A2540; font-size: 16px; font-weight: 700;">
            Plan Inputs
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            ${Object.entries(planData)
              .filter(([key]) => !key.startsWith('_'))
              .map(([key, value]) => {
                const displayKey = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/_/g, ' ')
                  .trim()
                  .split(' ')
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')

                let displayValue = value
                if (typeof value === 'number') {
                  if (key.includes('rate') || key.includes('percent') || key.includes('percentage')) {
                    displayValue = value.toFixed(2) + '%'
                  } else if (key.includes('price') || key.includes('payment') || key.includes('amount') || key.includes('down')) {
                    displayValue = '$' + Math.round(value).toLocaleString()
                  } else {
                    displayValue = value.toLocaleString()
                  }
                } else if (typeof value === 'boolean') {
                  displayValue = value ? 'Yes' : 'No'
                } else if (Array.isArray(value)) {
                  displayValue = value.join(', ')
                }

                return `
                  <div style="background: #F4F6F8; padding: 15px; border-radius: 8px;">
                    <strong style="color: #5C6570; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px;">
                      ${displayKey}
                    </strong>
                    <span style="font-size: 16px; color: #0A2540; font-weight: 600;">
                      ${displayValue}
                    </span>
                  </div>
                `
              })
              .join('')}
          </div>
        </div>

        <div style="border-top: 1px solid #DCE1E6; padding-top: 20px; color: #5C6570; font-size: 12px; text-align: center;">
          <p style="margin: 0;">
            This plan was created using the Financial Freedom Calculator.
            <br />
            Your plan data is securely stored and can be accessed anytime using your email address.
          </p>
        </div>
      </div>
    `

    document.body.appendChild(container)

    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= 297 // A4 height in mm

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297
    }

    // Clean up
    document.body.removeChild(container)

    // Download
    const filename = `Financial-Freedom-Plan-${planName.replace(/\s+/g, '-')}-${now.toISOString().split('T')[0]}.pdf`
    pdf.save(filename)

    return { success: true, filename }
  } catch (error) {
    console.error('PDF generation error:', error)
    return { success: false, error: 'Failed to generate PDF' }
  }
}
