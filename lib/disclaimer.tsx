import React from 'react'

/** Plain-text version for use inside string interpolation (DISC strings, etc.) */
export const BETTER_DISCLAIMER_TEXT = `© 2026 Better Home & Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License # 02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved.

Better BMC operates under the name Better Mortgage Corporation in New York.

Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. https://www.nmlsconsumeraccess.org/TuringTestPage.aspx?ReturnUrl=/EntityDetails.aspx/COMPANY/330511

Better Real Estate, LLC dba BRE, Better Home Services, BRE Services, LLC and Better Real Estate, and operating in the State of California through its wholly owned subsidiary Better Real Estate California Inc., is a licensed real estate brokerage and maintains its corporate headquarters at 325-41 Chestnut Street, Suite 826, Philadelphia, PA 19106. Full license listing: https://better.com/about-us/licenses — Equal Housing Opportunity. All rights reserved.

New York State Housing and Anti-Discrimination Notice | New York Standard Operating Procedures: https://better.com/content/pdfs/NY-StandardOperatingProcedures.pdf | Texas Real Estate Commission Information About Brokerage Services: https://www.trec.texas.gov/forms/information-about-brokerage-services | Consumer Protection Notice: https://www.trec.texas.gov/forms/consumer-protection-notice

Better Settlement Services, LLC. 325-41 Chestnut Street, Suite 803, Philadelphia, PA 19106.

Homeowners insurance policies are offered through Better Cover, LLC, a Pennsylvania Resident Producer Agency. License #881593. 325-41 Chestnut Street, Suite 807, Philadelphia, PA 19106. Full license listing: https://better.com/about-us/licenses

Better Inspect, LLC maintains its corporate headquarters at 325-41 Chestnut Street, Suite 846, Philadelphia, PA 19106.

Better Mortgage Corporation, Better Real Estate, LLC, Better Settlement Services, LLC, Better Cover, LLC, Better Connect, and Better Inspect, LLC are separate operating subsidiaries of Better Home & Finance Holding Company. Each company is a separate legal entity operated and managed through its own management and governance structure as required by its state of incorporation, and applicable and legal and regulatory requirements. Products not available in all states.

Any unauthorized use of any proprietary or intellectual property is strictly prohibited. All trademarks, service marks, trade names, logos, icons, and domain names are proprietary to Better Home & Finance Holding Company. Better Home & Finance Holding Company trademarks are federally registered with the U.S. Patent and Trademark Office. Better Cover is a registered trademark with the U.S. Patent and Trademark Office and is owned by Better Cover, LLC.`

const link = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{text}</a>
)

/** Full JSX disclaimer block with live hyperlinks. Drop inside any disclaimer section. */
export function BetterDisclaimer({ style }: { style?: React.CSSProperties }) {
  const base: React.CSSProperties = {
    fontSize: 10.5, color: '#94A3B8', lineHeight: 1.8,
    ...style,
  }
  const p: React.CSSProperties = { margin: '0 0 10px' }
  return (
    <div style={base}>
      <p style={p}>© 2026 Better Home &amp; Finance Holding Company and/or its affiliates. Better is a family of companies. Better Mortgage Corporation provides home loans; Better Real Estate, LLC and Better Real Estate California Inc License # 02164055 provides real estate services; Better Cover, LLC sells insurance products; and Better Settlement Services provides title insurance services; and Better Inspect, LLC provides home inspection services. All rights reserved.</p>
      <p style={p}>Better BMC operates under the name Better Mortgage Corporation in New York.</p>
      <p style={p}>Home lending products offered by Better Mortgage Corporation. Better Mortgage Corporation is a direct lender. NMLS #330511. 1 World Trade Center, 80th Floor, New York, NY 10007. Loans made or arranged pursuant to a California Finance Lenders Law License. Not available in all states. Equal Housing Lender. {link('https://www.nmlsconsumeraccess.org/TuringTestPage.aspx?ReturnUrl=/EntityDetails.aspx/COMPANY/330511', 'NMLS Consumer Access')}</p>
      <p style={p}>Better Real Estate, LLC dba BRE, Better Home Services, BRE Services, LLC and Better Real Estate, and operating in the State of California through its wholly owned subsidiary Better Real Estate California Inc., is a licensed real estate brokerage and maintains its corporate headquarters at 325-41 Chestnut Street, Suite 826, Philadelphia, PA 19106. {link('https://better.com/about-us/licenses', 'Here is a full listing of Better Real Estate, LLC\'s license numbers.')} Equal Housing Opportunity. All rights reserved.</p>
      <p style={p}>
        {link('https://better.com/content/pdfs/NY-StandardOperatingProcedures.pdf', 'New York State Housing and Anti-Discrimination Notice')} | {link('https://better.com/content/pdfs/NY-StandardOperatingProcedures.pdf', 'New York Standard Operating Procedures')} | {link('https://www.trec.texas.gov/forms/information-about-brokerage-services', 'Texas Real Estate Commission: Information About Brokerage Services')} | {link('https://www.trec.texas.gov/forms/consumer-protection-notice', 'Consumer Protection Notice')}
      </p>
      <p style={p}>Better Settlement Services, LLC. 325-41 Chestnut Street, Suite 803, Philadelphia, PA 19106.</p>
      <p style={p}>Homeowners insurance policies are offered through Better Cover, LLC, a Pennsylvania Resident Producer Agency. License #881593. 325-41 Chestnut Street, Suite 807, Philadelphia, PA 19106.</p>
      <p style={p}>Insurance quotes and policies are offered through Better Cover, LLC. A Pennsylvania Resident Producer Agency. License #881593. {link('https://better.com/about-us/licenses', 'Here is a full listing of Better Cover, LLC\'s license numbers.')}</p>
      <p style={p}>Better Inspect, LLC maintains its corporate headquarters at 325-41 Chestnut Street, Suite 846, Philadelphia, PA 19106.</p>
      <p style={p}>Better Mortgage Corporation, Better Real Estate, LLC, Better Settlement Services, LLC, Better Cover, LLC, Better Connect, and Better Inspect, LLC are separate operating subsidiaries of Better Home &amp; Finance Holding Company. Each company is a separate legal entity operated and managed through its own management and governance structure as required by its state of incorporation, and applicable and legal and regulatory requirements. Products not available in all states.</p>
      <p style={{ margin: 0 }}>Any unauthorized use of any proprietary or intellectual property is strictly prohibited. All trademarks, service marks, trade names, logos, icons, and domain names are proprietary to Better Home &amp; Finance Holding Company. Better Home &amp; Finance Holding Company trademarks are federally registered with the U.S. Patent and Trademark Office. Better Cover is a registered trademark with the U.S. Patent and Trademark Office and is owned by Better Cover, LLC.</p>
    </div>
  )
}
