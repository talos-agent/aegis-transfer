import { render, screen } from '@testing-library/react'
import { ClaimTransfer } from '../components/ClaimTransfer'

describe('ClaimTransfer', () => {
  it('renders the claim transfer component', () => {
    render(<ClaimTransfer />)
    
    expect(screen.getByText('Claim Transfer')).toBeInTheDocument()
  })

  it('renders transfer lookup form', () => {
    render(<ClaimTransfer />)
    
    expect(screen.getByText('Transfer ID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lookup/i })).toBeInTheDocument()
  })

  it('renders transfer lookup section', () => {
    render(<ClaimTransfer />)
    
    expect(screen.getByText('Transfer ID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lookup/i })).toBeInTheDocument()
  })
})
