import { useController } from '@/contexts/controller';
import { ellipseAddress } from '@/utils/utils';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import { Button } from '@mui/material';
import { useAccount } from '@starknet-react/core';

function WalletConnect() {
  const { isPending, playerName, login, openProfile } = useController()
  const { account, address } = useAccount();

  return (
    <>
      {account && address
        ? <Button
          loading={!playerName}
          onClick={() => openProfile()}
          variant='contained'
          color='secondary'
          size='small'
          fullWidth
          startIcon={<SportsEsportsOutlinedIcon htmlColor='secondary.contrastText' />}
          sx={{ justifyContent: 'center', color: 'secondary.contrastText', opacity: 1, height: '40px' }}
        >
          {playerName ? playerName : ellipseAddress(address, 4, 4)}
        </Button>

        : <Button
          loading={isPending}
          onClick={() => login()}
          variant='contained'
          color='secondary'
          size='small'
          fullWidth
          startIcon={<SportsEsportsOutlinedIcon htmlColor='secondary.contrastText' />}
          sx={{ justifyContent: 'center', color: 'secondary.contrastText', height: '40px' }}
        >
          Log In
        </Button>
      }
    </>
  );
}

export default WalletConnect
