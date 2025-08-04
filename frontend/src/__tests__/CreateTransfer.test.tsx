import { render, screen } from '@testing-library/react'
import { CreateTransfer } from '../components/CreateTransfer'

describe('CreateTransfer', () => {
  it('renders the create transfer component', () => {
    render(<CreateTransfer />)
    
    expect(screen.getByText('Send Transfer')).toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<CreateTransfer />)
    
    expect(screen.getByText('Recipient Address or ENS Name')).toBeInTheDocument()
    expect(screen.getByText('Token')).toBeInTheDocument()
    expect(screen.getByText(/Amount \(/)).toBeInTheDocument()
  })

  it('renders create transfer button', () => {
    render(<CreateTransfer />)
    
    expect(screen.getByRole('button', { name: /create transfer/i })).toBeInTheDocument()
  })
})
