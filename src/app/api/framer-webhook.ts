import type { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';
import axios from 'axios';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { email, slug } = req.body;

    if (!email || !slug) {
      return res.status(400).json({ error: 'Missing required fields: email or slug' });
    }

    try {
      // Stap 1: Haal gegevens op uit Framer CMS met de slug
      const cmsUrl = `https://cms.framer.website/api/pages/${slug}`; // Dynamische API-URL
      const cmsResponse = await axios.get(cmsUrl);
      const cmsData = cmsResponse.data;

      if (!cmsData || !cmsData.fileUrl) {
        return res.status(404).json({ error: 'No file found for this slug' });
      }

      const fileUrl = cmsData.fileUrl;

      // Stap 2: Download het bestand
      const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const fileData = fileResponse.data;
      const fileName = fileUrl.split('/').pop();

      // Stap 3: Stel een vaste e-mailtemplate in
      const msg = {
        to: email,
        from: process.env.FROM_EMAIL!,
        subject: 'Bedankt voor je aanvraag!',
        html: `
          <p>Hallo,</p>
          <p>Bedankt voor je interesse! Je vindt het bestand in de bijlage.</p>
          <p>Met vriendelijke groet,</p>
          <p>Het Team</p>
        `,
        attachments: [
          {
            content: fileData.toString('base64'),
            filename: fileName || 'file.pdf',
            type: 'application/pdf', // Of ander bestandstype
            disposition: 'attachment',
          },
        ],
      };

      // Stap 4: Verstuur de e-mail
      await sgMail.send(msg);

      res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
