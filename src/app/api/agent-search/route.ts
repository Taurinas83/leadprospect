import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/auth-custom';
import { LeadProspectingAgent } from '@/lib/lead-prospecting-agent';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    
    const body = await request.json();
    const { niche, location, leadType, maxLeads } = body;

    if (!niche) {
      return NextResponse.json(
        { error: 'O nicho é obrigatório' },
        { status: 400 }
      );
    }

    const apiKey = process.env.MIMIO_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key não configurada' },
        { status: 500 }
      );
    }

    const agent = new LeadProspectingAgent(apiKey);

    const result = await agent.execute({
      niche,
      location,
      leadType: leadType || 'pessoa_juridica',
      maxLeads: maxLeads || 20,
      userId: currentUser.id,
    });

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error);
    }
    
    console.error('[Agent API] Error:', error);
    return NextResponse.json(
      { error: 'Erro na prospecção automática', details: error.message },
      { status: 500 }
    );
  }
}
