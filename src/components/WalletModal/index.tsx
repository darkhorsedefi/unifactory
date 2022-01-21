import { AbstractConnector } from '@web3-react/abstract-connector'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import React, { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { CURRENCY } from 'assets/images'
import MetamaskIcon from 'assets/images/metamask.png'
import { ReactComponent as Close } from 'assets/images/x.svg'
import { injected, SUPPORTED_NETWORKS, newWalletlink, newWalletConnect } from 'connectors'
import { SUPPORTED_WALLETS, WALLET_NAMES } from '../../constants'
import usePrevious from 'hooks/usePrevious'
import { ApplicationModal } from 'state/application/actions'
import { useModalOpen, useWalletModalToggle } from 'state/application/hooks'
import AccountDetails from '../AccountDetails'
import networks from 'networks.json'
import Modal from '../Modal'
import Option from './Option'
import PendingView from './PendingView'

const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 1rem;

  &:hover {
    cursor: pointer;
    opacity: 0.5;
  }
`

const CloseColor = styled(Close)`
  path {
    stroke: ${({ theme }) => theme.text4};
  }
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
`

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${(props) => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

const ContentWrapper = styled.div`
  background-color: ${({ theme }) => theme.bg2};
  padding: 2rem;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 1rem`};
`

const Title = styled.h3`
  font-weight: 500;
  display: flex;
  align-items: center;
  margin-top: 0;
  padding: 0 0 0.6rem;
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const OptionsWrapped = styled.div`
  display: flex;
  overflow-y: auto;
  max-height: 35rem;

  .column {
    :not(:last-child) {
      margin-right: 0.7rem;
    }
  }
`

const Options = styled.div<{ disabled?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  overflow-y: auto;
  max-height: 24rem;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
  `};

  ${({ disabled }) => (disabled ? 'pointer-events: none; opacity: 0.6' : '')};
`

const HoverText = styled.div`
  :hover {
    cursor: pointer;
  }
`

const WALLET_VIEWS = {
  OPTIONS: 'options',
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending',
}

export default function WalletModal({
  pendingTransactions,
  confirmedTransactions,
  ENSName,
}: {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}) {
  // important that these are destructed from the account-specific web3-react context
  const { active, account, connector, activate, error } = useWeb3React()

  const [currentChainId, setCurrentChainId] = useState<number>(0)
  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)
  const [pendingWallet, setPendingWallet] = useState<AbstractConnector | undefined>()
  const [pendingError, setPendingError] = useState<boolean>()

  const walletModalOpen = useModalOpen(ApplicationModal.WALLET)
  const toggleWalletModal = useWalletModalToggle()

  const previousAccount = usePrevious(account)

  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen])

  const { t } = useTranslation()

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)
  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector && connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [setWalletView, active, error, connector, walletModalOpen, activePrevious, connectorPrevious])

  const tryActivation = async (connector: AbstractConnector | undefined) => {
    setPendingWallet(connector) // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING)

    // if the connector is walletconnect and the user has already tried to connect, manually reset the connector
    if (connector instanceof WalletConnectConnector && connector.walletConnectProvider?.wc?.uri) {
      connector.walletConnectProvider = undefined
    }

    connector &&
      activate(connector, undefined, true).catch((error) => {
        if (error instanceof UnsupportedChainIdError) {
          activate(connector) // a little janky...can't use setError because the connector isn't set
        } else {
          setPendingError(true)
        }
      })
  }

  function getAvalableNetworks() {
    return Object.keys(SUPPORTED_NETWORKS).map((chainId) => (
      <Option
        onClick={() => setCurrentChainId(Number(chainId))}
        id={`connect-network-${chainId}`}
        key={chainId}
        active={currentChainId === Number(chainId)}
        //@ts-ignore
        color={networks[chainId]?.color || ''}
        //@ts-ignore
        header={networks[chainId].name}
        subheader={null}
        //@ts-ignore
        icon={CURRENCY[chainId] ?? ''}
      />
    ))
  }

  function returnUpdatedConnector(option: { name: string }) {
    switch (option.name) {
      case WALLET_NAMES.WALLET_CONNECT:
        return newWalletConnect(currentChainId)
      case WALLET_NAMES.WALLET_LINK:
        return newWalletlink(currentChainId)
      default:
        return
    }
  }

  function getAvailableWallets() {
    const isMetamask = window.ethereum && window.ethereum.isMetaMask
    const availableOptions = Object.keys(SUPPORTED_WALLETS).map((key) => {
      const option = SUPPORTED_WALLETS[key]

      if (option.name !== WALLET_NAMES.METAMASK && currentChainId) {
        const newConnector = returnUpdatedConnector(option)

        if (newConnector) option.connector = newConnector
      }

      // check for mobile options
      if (isMobile) {
        if (!window.web3 && !window.ethereum && option.mobile) {
          return (
            <Option
              onClick={() => {
                option.connector !== connector && !option.href && tryActivation(option.connector)
              }}
              id={`connect-${key}`}
              key={key}
              active={option.connector && option.connector === connector}
              color={option.color}
              link={option.href}
              header={option.name}
              subheader={null}
              icon={require('../../assets/images/' + option.iconName)}
            />
          )
        }
        return null
      }

      // overwrite injected when needed
      if (option.connector === injected) {
        // don't show injected if there's no injected provider
        if (!(window.web3 || window.ethereum)) {
          if (option.name === WALLET_NAMES.METAMASK) {
            return (
              <Option
                id={`connect-${key}`}
                key={key}
                color={'#E8831D'}
                header={'Install Metamask'}
                subheader={null}
                link={'https://metamask.io/'}
                icon={MetamaskIcon}
              />
            )
          }

          return null //dont want to return install twice
        }
        // don't return metamask if injected provider isn't metamask
        else if (option.name === WALLET_NAMES.METAMASK && !isMetamask) {
          return null
        }
        // likewise for generic
        else if (option.name === WALLET_NAMES.INJECTED && isMetamask) {
          return null
        }
      }

      // return rest of options
      return (
        !isMobile &&
        !option.mobileOnly && (
          <Option
            id={`connect-${key}`}
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector)
            }}
            key={key}
            active={option.connector === connector}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={null} //use option.descriptio to bring back multi-line
            icon={require('../../assets/images/' + option.iconName)}
          />
        )
      )
    })

    return availableOptions
  }

  function getModalContent() {
    if (error) {
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <CloseColor />
          </CloseIcon>
          <HeaderRow>{error instanceof UnsupportedChainIdError ? 'Wrong Network' : 'Error connecting'}</HeaderRow>
          <ContentWrapper>
            {error instanceof UnsupportedChainIdError ? (
              <h5>Please switch your network or connect to the appropriate network.</h5>
            ) : (
              'Error connecting. Try refreshing the page.'
            )}
          </ContentWrapper>
        </UpperSection>
      )
    }

    if (account && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
        />
      )
    }

    const availableNetworks = getAvalableNetworks()
    const availableWallets = getAvailableWallets()
    const hasWallet = availableWallets.some((option) => option !== null)


    return (
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        {walletView !== WALLET_VIEWS.ACCOUNT ? (
          <HeaderRow color="blue">
            <HoverText
              onClick={() => {
                setPendingError(false)
                setWalletView(WALLET_VIEWS.ACCOUNT)
              }}
            >
              Back
            </HoverText>
          </HeaderRow>
        ) : (
          <HeaderRow>
            <HoverText>{t('connectWallet')}</HoverText>
          </HeaderRow>
        )}
        <ContentWrapper>
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              connector={pendingWallet}
              error={pendingError}
              setPendingError={setPendingError}
              tryActivation={tryActivation}
            />
          ) : (
            <>
              {!Boolean(hasWallet) ? (
                t('noConnectionMethodsAvailable')
              ) : (
                <OptionsWrapped>
                  <div className="column">
                    <Title>1. {t('chooseNetwork')}</Title>
                    <Options>{availableNetworks}</Options>
                  </div>

                  <div className="column">
                    <Title>2. {t('chooseWallet')}</Title>
                    <Options disabled={!currentChainId}>{availableWallets}</Options>
                  </div>
                </OptionsWrapped>
              )}
            </>
          )}
        </ContentWrapper>
      </UpperSection>
    )
  }

  return (
    <Modal
      isOpen={walletModalOpen}
      onDismiss={toggleWalletModal}
      minHeight={false}
      maxWidth={
        (walletView === WALLET_VIEWS.ACCOUNT && !active) || walletView === WALLET_VIEWS.OPTIONS ? 750 : undefined
      }
    >
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
