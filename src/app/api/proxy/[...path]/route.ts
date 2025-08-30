import { NextRequest } from 'next/server';
import { loadConfig } from '@/lib/config';

async function forwardRequest(request: NextRequest, method: string) {
  try {
    const config = loadConfig();
    
    // Extract path from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').slice(4); // Remove /api/proxy from path
    const targetPath = '/' + pathSegments.join('/');
    const targetUrl = new URL(targetPath + url.search, config.litellm.base_url);
    
    // Prepare headers for forwarding
    const headers = new Headers();
    
    // Forward all original headers if configured
    if (config.proxy.forward_headers) {
      request.headers.forEach((value, key) => {
        // Skip host header to avoid conflicts
        if (key.toLowerCase() !== 'host') {
          headers.set(key, value);
        }
      });
    }
    
    // Add authentication token
    headers.set('Authorization', `Bearer ${config.auth.anthropic_token}`);
    
    // Get request body for POST/PUT/PATCH methods
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await request.text();
    }
    
    // Make the forwarded request
    const response = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(config.litellm.timeout),
    });
    
    // Prepare response headers
    const responseHeaders = new Headers();
    
    // Forward response headers if configured
    if (config.proxy.forward_response_headers) {
      response.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });
    }
    
    // Get response body
    const responseBody = await response.arrayBuffer();
    
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new Response(JSON.stringify({ error: 'Request timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: NextRequest) {
  return forwardRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return forwardRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return forwardRequest(request, 'PUT');
}

export async function PATCH(request: NextRequest) {
  return forwardRequest(request, 'PATCH');
}

export async function DELETE(request: NextRequest) {
  return forwardRequest(request, 'DELETE');
}

export async function OPTIONS(request: NextRequest) {
  return forwardRequest(request, 'OPTIONS');
}